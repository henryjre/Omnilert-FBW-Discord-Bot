const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPortalNotificationHandler,
  isValidPortalNotificationPayload,
  buildPortalNotificationContainer,
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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
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

test('container accent color distinguishes unread from read', () => {
  const unread = buildPortalNotificationContainer(buildPayload(), { status: 'unread' }).toJSON();
  const read = buildPortalNotificationContainer(buildPayload(), { status: 'read' }).toJSON();
  assert.notEqual(unread.accent_color, read.accent_color);
});

test('container includes a link button only when link_url is a valid https url', () => {
  const withLink = buildPortalNotificationContainer(buildPayload(), { status: 'unread' }).toJSON();
  const withoutLink = buildPortalNotificationContainer(
    buildPayload({ notification: { link_url: '/relative' } }),
    { status: 'unread' }
  ).toJSON();

  const linkButtons = (component) =>
    JSON.stringify(component).match(/"style":5/g)?.length || 0;

  assert.ok(linkButtons(withLink) > linkButtons(withoutLink));
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

test('handler posts a fallback channel notice when the user cannot be DMed', async () => {
  let channelPayload = null;
  const dmError = new Error('Cannot send messages to this user');
  dmError.code = 50007;

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
