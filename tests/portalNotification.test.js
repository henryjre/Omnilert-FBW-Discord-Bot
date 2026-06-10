const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPortalNotificationHandler,
  createPortalOpenHandler,
  isValidPortalNotificationPayload,
  buildPortalNotificationMessage,
  buildOpenInPortalUrl,
  isValidHttpsUrl,
} = require('../src/webhook/websiteRoutes/notifications/portalNotification');

function buildPayload(overrides = {}) {
  return {
    event: 'notification.created',
    version: 1,
    environment: 'production',
    sent_at: '2026-06-08T03:21:00.000Z',
    recipient: {
      user_id: '9f1c-uuid',
      discord_user_id: '123456789012345678',
      ...(overrides.recipient || {}),
    },
    notification: {
      id: 'a2b3-uuid',
      title: 'New Task Assigned',
      message: 'Omnilert Superuser assigned you a task in Case #0004: sample',
      type: 'info',
      link_path: '/case-reports?caseId=1',
      link_url: 'https://app.omnilert.com/case-reports?caseId=1',
      created_at: '2026-06-08T03:21:00.000Z',
      ...(overrides.notification || {}),
    },
    ...overrides.top,
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    redirectedTo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    redirect(code, url) {
      this.statusCode = code;
      this.redirectedTo = url;
      return this;
    },
  };
}

function createMockDb() {
  const calls = [];
  return {
    calls,
    prepare() {
      return {
        run: (...args) => {
          calls.push(args);
          return { changes: 1 };
        },
      };
    },
  };
}

function createMockUser({ send }) {
  return { send };
}

function createMockClient({ user, channel } = {}) {
  return {
    users: {
      fetch: async () => user,
    },
    channels: {
      cache: new Map(channel ? [['1513405109655175168', channel]] : []),
      fetch: async () => channel,
    },
  };
}

test('isValidPortalNotificationPayload accepts a valid payload', () => {
  assert.equal(isValidPortalNotificationPayload(buildPayload()), true);
});

test('isValidPortalNotificationPayload rejects malformed payloads', () => {
  assert.equal(isValidPortalNotificationPayload(null), false);
  assert.equal(
    isValidPortalNotificationPayload(buildPayload({ recipient: { discord_user_id: '' } })),
    false
  );
  assert.equal(
    isValidPortalNotificationPayload(buildPayload({ notification: { id: '' } })),
    false
  );
  assert.equal(isValidPortalNotificationPayload(buildPayload({ top: { version: '1' } })), false);
});

test('isValidHttpsUrl only accepts https urls', () => {
  assert.equal(isValidHttpsUrl('https://app.omnilert.com/x'), true);
  assert.equal(isValidHttpsUrl('http://app.omnilert.com/x'), false);
  assert.equal(isValidHttpsUrl('/relative'), false);
  assert.equal(isValidHttpsUrl(''), false);
});

test('embed accent color distinguishes unread from read', () => {
  const unread = buildPortalNotificationMessage(buildPayload(), {
    status: 'unread',
  }).embeds[0].toJSON();
  const read = buildPortalNotificationMessage(buildPayload(), {
    status: 'read',
  }).embeds[0].toJSON();
  assert.notEqual(unread.color, read.color);
});

test('message includes a link button only when link_url is a valid https url', () => {
  const withLink = buildPortalNotificationMessage(buildPayload(), {
    status: 'unread',
  });
  const withoutLink = buildPortalNotificationMessage(
    buildPayload({ notification: { link_url: '/relative' } }),
    { status: 'unread' }
  );

  const linkButtons = (msg) =>
    JSON.stringify(msg.components).match(/"style":5/g)?.length || 0;

  assert.ok(linkButtons(withLink) > linkButtons(withoutLink));
});

test('buildOpenInPortalUrl routes through the base url when set', () => {
  const url = buildOpenInPortalUrl(
    { id: 'a2b3-uuid', link_url: 'https://app.omnilert.com/x' },
    'https://bot.omnilert.app/'
  );
  assert.equal(
    url,
    'https://bot.omnilert.app/website/notifications/portal/open/a2b3-uuid'
  );
});

test('buildOpenInPortalUrl falls back to the raw link when base url is unset', () => {
  const url = buildOpenInPortalUrl(
    { id: 'a2b3-uuid', link_url: 'https://app.omnilert.com/x' },
    ''
  );
  assert.equal(url, 'https://app.omnilert.com/x');
});

test('buildOpenInPortalUrl returns null when link_url is not a valid https url', () => {
  assert.equal(
    buildOpenInPortalUrl({ id: 'x', link_url: '/relative' }, 'https://bot.app'),
    null
  );
});

test('handler returns 401 when authorization is missing or wrong', async () => {
  const handler = createPortalNotificationHandler({
    clientInstance: createMockClient(),
    db: createMockDb(),
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler({ headers: {}, body: buildPayload() }, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { ok: false, message: 'Unauthorized' });
});

test('handler returns 400 for an invalid payload', async () => {
  const handler = createPortalNotificationHandler({
    clientInstance: createMockClient(),
    db: createMockDb(),
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: { event: 'nope' } },
    res
  );

  assert.equal(res.statusCode, 400);
});

test('handler DMs the recipient when authorized with a valid payload', async () => {
  let dmPayload = null;
  const user = createMockUser({
    send: async (payload) => {
      dmPayload = payload;
      return { id: 'dm-message-id', channelId: 'dm-channel-id' };
    },
  });
  const handler = createPortalNotificationHandler({
    clientInstance: createMockClient({ user }),
    db: createMockDb(),
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.ok(dmPayload, 'expected a DM to be sent');
  assert.ok(Array.isArray(dmPayload.components) && dmPayload.components.length === 1);
});

for (const code of [50007, 50278]) {
  test(`handler posts a fallback channel notice when DM fails with code ${code}`, async () => {
    let channelPayload = null;
    const dmError = new Error('Cannot send messages to this user');
    dmError.code = code;

    const user = createMockUser({
      send: async () => {
        throw dmError;
      },
    });
    const channel = {
      send: async (payload) => {
        channelPayload = payload;
        return { id: 'fallback-message-id' };
      },
    };
    const handler = createPortalNotificationHandler({
      clientInstance: createMockClient({ user, channel }),
      db: createMockDb(),
      expectedToken: 'expected-token',
    });
    const res = createMockRes();

    await handler(
      { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.ok(channelPayload, 'expected a fallback channel message');
    assert.deepEqual(channelPayload.allowedMentions.users, ['123456789012345678']);
  });
}

test('handler returns 500 for unexpected DM errors', async () => {
  const user = createMockUser({
    send: async () => {
      throw new Error('network down');
    },
  });
  const handler = createPortalNotificationHandler({
    clientInstance: createMockClient({ user }),
    db: createMockDb(),
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
    res
  );

  assert.equal(res.statusCode, 500);
});

// --- Open-in-Portal redirect handler --------------------------------------

function createOpenMockDb(row) {
  const updates = [];
  return {
    updates,
    prepare(sql) {
      return {
        get: () => (row ? { ...row } : undefined),
        run: (...args) => {
          updates.push({ sql, args });
          return { changes: 1 };
        },
      };
    },
  };
}

function createOpenMockClient({ editedWith } = {}) {
  const message = {
    edit: async (payload) => {
      if (editedWith) editedWith.payload = payload;
      return message;
    },
  };
  const channel = {
    send: async () => ({}),
    messages: { fetch: async () => message },
  };
  return {
    channels: {
      cache: new Map(),
      fetch: async () => channel,
    },
  };
}

test('open handler recolors the message, marks read, and redirects', async () => {
  const editedWith = {};
  const db = createOpenMockDb({
    notification_id: 'a2b3-uuid',
    dm_channel_id: 'dm-channel-id',
    message_id: 'dm-message-id',
    status: 'unread',
    title: 'New Task Assigned',
    color: '#112233',
    link_url: 'https://app.omnilert.com/case-reports?caseId=1',
    created_at: '2026-06-08T03:21:00.000Z',
  });
  const handler = createPortalOpenHandler({
    clientInstance: createOpenMockClient({ editedWith }),
    db,
  });
  const res = createMockRes();

  await handler({ params: { notificationId: 'a2b3-uuid' } }, res);

  assert.equal(res.statusCode, 302);
  assert.equal(res.redirectedTo, 'https://app.omnilert.com/case-reports?caseId=1');
  assert.ok(editedWith.payload, 'expected the DM message to be edited');
  // The rebuilt embed should carry the read (grey) color, not the original.
  assert.equal(editedWith.payload.embeds[0].toJSON().color, 0x95a5a6);
  // status was updated to read.
  assert.ok(
    db.updates.some((u) => u.args.some((a) => a && a.status === 'read')),
    'expected a status=read update'
  );
});

test('open handler skips re-editing when already read but still redirects', async () => {
  const editedWith = {};
  const db = createOpenMockDb({
    notification_id: 'a2b3-uuid',
    dm_channel_id: 'dm-channel-id',
    message_id: 'dm-message-id',
    status: 'read',
    title: 'New Task Assigned',
    color: '#112233',
    link_url: 'https://app.omnilert.com/x',
    created_at: '2026-06-08T03:21:00.000Z',
  });
  const handler = createPortalOpenHandler({
    clientInstance: createOpenMockClient({ editedWith }),
    db,
  });
  const res = createMockRes();

  await handler({ params: { notificationId: 'a2b3-uuid' } }, res);

  assert.equal(res.statusCode, 302);
  assert.equal(res.redirectedTo, 'https://app.omnilert.com/x');
  assert.equal(editedWith.payload, undefined, 'should not edit an already-read message');
});

test('open handler returns 404 for an unknown notification id', async () => {
  const handler = createPortalOpenHandler({
    clientInstance: createOpenMockClient(),
    db: createOpenMockDb(null),
  });
  const res = createMockRes();

  await handler({ params: { notificationId: 'missing' } }, res);

  assert.equal(res.statusCode, 404);
});

test('open handler still redirects when the message edit fails', async () => {
  const db = createOpenMockDb({
    notification_id: 'a2b3-uuid',
    dm_channel_id: 'dm-channel-id',
    message_id: 'dm-message-id',
    status: 'unread',
    title: 'New Task Assigned',
    color: '#112233',
    link_url: 'https://app.omnilert.com/x',
    created_at: '2026-06-08T03:21:00.000Z',
  });
  const brokenClient = {
    channels: {
      cache: new Map(),
      fetch: async () => {
        throw new Error('channel gone');
      },
    },
  };
  const handler = createPortalOpenHandler({ clientInstance: brokenClient, db });
  const res = createMockRes();

  await handler({ params: { notificationId: 'a2b3-uuid' } }, res);

  assert.equal(res.statusCode, 302);
  assert.equal(res.redirectedTo, 'https://app.omnilert.com/x');
});
