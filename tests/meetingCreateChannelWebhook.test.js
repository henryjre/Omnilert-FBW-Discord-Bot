const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

const {
  MEETING_VOICE_CATEGORY_ID,
  buildMeetingChannelMessage,
  createMeetingChannelWebhookHandler,
  createMeetingCreateChannelHandler,
  isValidMeetingCreateChannelPayload,
  isValidMeetingChannelWebhookPayload,
  isValidMeetingUpdateParticipantsPayload,
  normalizeChannelName,
  getMeetingCompanyNames,
  buildMeetingCompanyLine,
  formatMeetingStartsAt,
  formatMeetingDuration,
} = require('../src/webhook/websiteRoutes/meetings/createChannel');

// Flattens every TextDisplay content in a Components V2 message into one string.
function getContainerText(message) {
  const container = message.components[0].toJSON();
  return (container.components || [])
    .map((component) => component.content)
    .filter((content) => typeof content === 'string')
    .join('\n');
}

function buildPayload(overrides = {}) {
  const payload = {
    event: 'meeting.create_channel',
    version: 1,
    environment: 'development',
    sent_at: '2026-07-14T09:00:00.000Z',
    meeting: {
      id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862',
      title: 'Q3 Inventory Shrinkage Review',
      agenda: 'Review the Q3 inventory shrinkage numbers and agree corrective actions.',
      starts_at: '2026-07-15T02:00:00.000Z',
      duration_minutes: 45,
      company_id: 'c6c29aa5-1af2-4a93-baed-895ed098c6da',
      company_name: 'Monster Siomai',
      companies: [
        { id: 'c6c29aa5-1af2-4a93-baed-895ed098c6da', name: 'Monster Siomai' },
      ],
      created_by: {
        user_id: 'creator-uuid',
        name: 'Carl Anthony Camaya',
        discord_user_id: '123456789012345678',
      },
      link_url: 'https://app.omnilert.app/account/meetings?meetingId=dfb8ba84',
    },
    participants: [
      {
        user_id: 'participant-uuid',
        name: 'Henry Pineda',
        discord_user_id: '987654321098765432',
      },
    ],
  };

  return {
    ...payload,
    ...overrides,
    meeting: { ...payload.meeting, ...(overrides.meeting || {}) },
    participants: overrides.participants || payload.participants,
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

function createMockDb(initialRows = []) {
  const rows = new Map(initialRows.map((row) => [row.meeting_id, row]));
  const calls = { select: 0, save: 0 };

  return {
    calls,
    rows,
    prepare(sql) {
      if (/SELECT meeting_id, voice_channel_id, guild_id/i.test(sql)) {
        return {
          get: (meetingId) => {
            calls.select += 1;
            return rows.get(meetingId) || null;
          },
        };
      }

      if (/INSERT INTO meeting_voice_channels/i.test(sql)) {
        return {
          run: (data) => {
            calls.save += 1;
            rows.set(data.meeting_id, {
              meeting_id: data.meeting_id,
              voice_channel_id: data.voice_channel_id,
              guild_id: data.guild_id,
              payload: data.payload,
            });
            return { changes: 1 };
          },
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
}

function createMockClient({ channelId = '1398472048572048', sendError, createError } = {}) {
  const createdChannels = [];
  const sentMessages = [];
  const deletedChannels = [];

  const channel = {
    id: channelId,
    send: async (payload) => {
      if (sendError) throw sendError;
      sentMessages.push(payload);
      return { id: 'meeting-message-id' };
    },
    delete: async (reason) => {
      deletedChannels.push({ id: channelId, reason });
    },
  };

  const guild = {
    id: 'guild123',
    roles: {
      everyone: { id: 'guild123' },
    },
    channels: {
      create: async (payload) => {
        if (createError) throw createError;
        createdChannels.push(payload);
        return channel;
      },
    },
  };

  const client = {
    user: { id: 'bot-user-id' },
    guilds: {
      cache: new Map([['guild123', guild]]),
      fetch: async (guildId) => (guildId === 'guild123' ? guild : null),
    },
  };

  return { client, createdChannels, sentMessages, deletedChannels };
}

function createNoopLock() {
  return {
    acquire: async (key, fn) => fn(),
  };
}

test('isValidMeetingCreateChannelPayload accepts a valid payload', () => {
  assert.equal(isValidMeetingCreateChannelPayload(buildPayload()), true);
});

test('isValidMeetingChannelWebhookPayload accepts create and delete events', () => {
  assert.equal(isValidMeetingChannelWebhookPayload(buildPayload()), true);
  assert.equal(
    isValidMeetingChannelWebhookPayload({
      event: 'meeting.delete_channel',
      version: 1,
      environment: 'development',
      sent_at: '2026-07-14T09:12:44.031Z',
      meeting: { id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862' },
      voice_channel_id: '1398472048572048',
      reason: 'cancelled',
    }),
    true,
  );
  assert.equal(
    isValidMeetingChannelWebhookPayload({
      event: 'meeting.update_participants',
      version: 1,
      environment: 'production',
      sent_at: '2026-07-15T09:00:00.000Z',
      meeting: { id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862' },
      voice_channel_id: '1398472048572048',
      added: [{ user_id: 'user-1', name: 'Ken Reyes', discord_user_id: '456' }],
      removed: [{ user_id: 'user-2', name: 'Mia Santos', discord_user_id: '789' }],
    }),
    true,
  );
  assert.equal(isValidMeetingChannelWebhookPayload({ event: 'meeting.unknown' }), false);
});

test('isValidMeetingUpdateParticipantsPayload rejects malformed payloads', () => {
  const payload = {
    event: 'meeting.update_participants',
    version: 1,
    environment: 'production',
    sent_at: '2026-07-15T09:00:00.000Z',
    meeting: { id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862' },
    voice_channel_id: '1398472048572048',
    added: [{ user_id: 'user-1', name: 'Ken Reyes', discord_user_id: '456' }],
    removed: [{ user_id: 'user-2', name: 'Mia Santos', discord_user_id: '789' }],
  };

  assert.equal(isValidMeetingUpdateParticipantsPayload(payload), true);
  assert.equal(isValidMeetingUpdateParticipantsPayload({ ...payload, event: 'nope' }), false);
  assert.equal(
    isValidMeetingUpdateParticipantsPayload({ ...payload, meeting: { id: '' } }),
    false,
  );
  assert.equal(isValidMeetingUpdateParticipantsPayload({ ...payload, voice_channel_id: '' }), false);
  assert.equal(isValidMeetingUpdateParticipantsPayload({ ...payload, added: null }), false);
  assert.equal(
    isValidMeetingUpdateParticipantsPayload({
      ...payload,
      removed: [{ user_id: 'user-2', name: 'Mia Santos', discord_user_id: '' }],
    }),
    false,
  );
});

test('isValidMeetingCreateChannelPayload rejects malformed payloads', () => {
  assert.equal(isValidMeetingCreateChannelPayload(null), false);
  assert.equal(isValidMeetingCreateChannelPayload(buildPayload({ event: 'nope' })), false);
  assert.equal(isValidMeetingCreateChannelPayload(buildPayload({ meeting: { id: '' } })), false);
  assert.equal(
    isValidMeetingCreateChannelPayload(buildPayload({ meeting: { duration_minutes: '45' } })),
    false,
  );
  assert.equal(
    isValidMeetingCreateChannelPayload(buildPayload({ participants: [{ discord_user_id: '' }] })),
    false,
  );
});

test('isValidMeetingCreateChannelPayload accepts the website companies array', () => {
  assert.equal(
    isValidMeetingCreateChannelPayload(buildPayload({
      meeting: {
        companies: [
          { id: 'company-1', name: 'Monster Siomai - Ayala' },
          { id: 'company-2', name: 'Monster Siomai - BGC' },
        ],
      },
    })),
    true,
  );
});

test('isValidMeetingCreateChannelPayload rejects malformed companies entries', () => {
  assert.equal(
    isValidMeetingCreateChannelPayload(buildPayload({ meeting: { companies: 'Cubao' } })),
    false,
  );
  assert.equal(
    isValidMeetingCreateChannelPayload(
      buildPayload({ meeting: { companies: [{ id: 'company-1' }] } }),
    ),
    false,
  );
  assert.equal(
    isValidMeetingCreateChannelPayload(
      buildPayload({ meeting: { companies: [{ id: '', name: 'Cubao' }] } }),
    ),
    false,
  );
});

test('getMeetingCompanyNames prefers companies and falls back to company_name', () => {
  assert.deepEqual(
    getMeetingCompanyNames({
      company_name: 'Monster Siomai - Ayala',
      companies: [
        { id: 'company-1', name: 'Monster Siomai - Ayala' },
        { id: 'company-2', name: 'Monster Siomai - BGC' },
      ],
    }),
    ['Monster Siomai - Ayala', 'Monster Siomai - BGC'],
  );

  assert.deepEqual(getMeetingCompanyNames({ company_name: 'Monster Siomai' }), ['Monster Siomai']);
  assert.deepEqual(
    getMeetingCompanyNames({ companies: [], company_name: 'Monster Siomai' }),
    ['Monster Siomai'],
  );
  assert.deepEqual(getMeetingCompanyNames({}), []);
});

test('getMeetingCompanyNames dedupes and trims company names', () => {
  assert.deepEqual(
    getMeetingCompanyNames({
      companies: [
        { id: 'company-1', name: ' Monster Siomai - Ayala ' },
        { id: 'company-2', name: 'Monster Siomai - Ayala' },
        { id: 'company-3', name: '   ' },
      ],
    }),
    ['Monster Siomai - Ayala'],
  );
});

test('buildMeetingCompanyLine pluralizes the label and truncates long lists', () => {
  assert.deepEqual(
    buildMeetingCompanyLine({ company_name: 'Monster Siomai' }),
    { label: 'Company', value: 'Monster Siomai' },
  );
  assert.deepEqual(
    buildMeetingCompanyLine({
      companies: [
        { id: 'company-1', name: 'Monster Siomai - Ayala' },
        { id: 'company-2', name: 'Monster Siomai - BGC' },
      ],
    }),
    { label: 'Companies', value: 'Monster Siomai - Ayala, Monster Siomai - BGC' },
  );
  assert.deepEqual(buildMeetingCompanyLine({}), { label: 'Company', value: 'N/A' });

  const many = Array.from({ length: 200 }, (_, index) => ({
    id: `company-${index}`,
    name: `Company Number ${index}`,
  }));
  const line = buildMeetingCompanyLine({ companies: many });
  assert.equal(line.label, 'Companies');
  assert.ok(line.value.length <= 1024);
  assert.match(line.value, /\+200 total$/);
});

test('formatMeetingStartsAt renders MMMM DD [at] h:mm A in Manila time', () => {
  assert.equal(formatMeetingStartsAt('2026-08-21T14:00:00.000Z'), 'August 21 at 10:00 PM');
  assert.equal(formatMeetingStartsAt('2026-07-15T02:00:00.000Z'), 'July 15 at 10:00 AM');
  assert.equal(formatMeetingStartsAt(''), 'N/A');
  assert.equal(formatMeetingStartsAt('not-a-date'), 'not-a-date');
});

test('formatMeetingDuration renders hours and minutes', () => {
  assert.equal(formatMeetingDuration(45), '45 minutes');
  assert.equal(formatMeetingDuration(60), '1 hour');
  assert.equal(formatMeetingDuration(90), '1 hour 30 minutes');
  assert.equal(formatMeetingDuration(125), '2 hours 5 minutes');
  assert.equal(formatMeetingDuration(1), '1 minute');
  assert.equal(formatMeetingDuration(0), '0 minutes');
  assert.equal(formatMeetingDuration('45'), 'N/A');
});

test('handler renders every company in the meeting container', async () => {
  const { client, sentMessages } = createMockClient();
  const handler = createMeetingCreateChannelHandler({
    clientInstance: client,
    db: createMockDb(),
    expectedToken: 'expected-token',
    guildId: 'guild123',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler(
    {
      headers: { authorization: 'Bearer expected-token' },
      body: buildPayload({
        meeting: {
          company_id: 'company-1',
          company_name: 'Monster Siomai - Ayala',
          companies: [
            { id: 'company-1', name: 'Monster Siomai - Ayala' },
            { id: 'company-2', name: 'Monster Siomai - BGC' },
          ],
        },
      }),
    },
    res,
  );

  assert.equal(res.statusCode, 200);

  const text = getContainerText(sentMessages[0]);
  assert.match(text, /Companies: \*\*Monster Siomai - Ayala, Monster Siomai - BGC\*\*/);
});

test('normalizeChannelName trims, collapses whitespace, and caps at 100 characters', () => {
  assert.equal(normalizeChannelName('  Q3   Inventory   Review  '), 'Q3 Inventory Review');
  assert.equal(normalizeChannelName('x'.repeat(120)).length, 100);
});

test('handler returns 401 when authorization is missing or wrong', async () => {
  const { client } = createMockClient();
  const handler = createMeetingCreateChannelHandler({
    clientInstance: client,
    db: createMockDb(),
    expectedToken: 'expected-token',
    guildId: 'guild123',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler({ headers: {}, body: buildPayload() }, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: 'Unauthorized' });
});

test('handler returns 400 for an invalid payload', async () => {
  const { client } = createMockClient();
  const handler = createMeetingCreateChannelHandler({
    clientInstance: client,
    db: createMockDb(),
    expectedToken: 'expected-token',
    guildId: 'guild123',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload({ meeting: { title: '' } }) },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, message: 'Invalid payload' });
});

test('handler creates a private voice channel and sends meeting details', async () => {
  const { client, createdChannels, sentMessages } = createMockClient();
  const handler = createMeetingCreateChannelHandler({
    clientInstance: client,
    db: createMockDb(),
    expectedToken: 'expected-token',
    guildId: 'guild123',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    voice_channel_id: '1398472048572048',
  });
  assert.equal(createdChannels.length, 1);

  const createdChannel = createdChannels[0];
  assert.equal(createdChannel.name, 'Q3 Inventory Shrinkage Review');
  assert.equal(createdChannel.type, ChannelType.GuildVoice);
  assert.equal(createdChannel.parent, MEETING_VOICE_CATEGORY_ID);

  const everyoneOverwrite = createdChannel.permissionOverwrites.find((item) => item.id === 'guild123');
  assert.ok(everyoneOverwrite);
  assert.ok(everyoneOverwrite.deny.includes(PermissionFlagsBits.ViewChannel));
  assert.ok(everyoneOverwrite.deny.includes(PermissionFlagsBits.Connect));

  const participantOverwrite = createdChannel.permissionOverwrites.find(
    (item) => item.id === '987654321098765432',
  );
  assert.ok(participantOverwrite);
  assert.ok(participantOverwrite.allow.includes(PermissionFlagsBits.ViewChannel));
  assert.ok(participantOverwrite.allow.includes(PermissionFlagsBits.Connect));
  assert.ok(participantOverwrite.allow.includes(PermissionFlagsBits.Speak));
  assert.ok(participantOverwrite.allow.includes(PermissionFlagsBits.SendMessages));
  assert.ok(participantOverwrite.allow.includes(PermissionFlagsBits.ReadMessageHistory));

  const botOverwrite = createdChannel.permissionOverwrites.find((item) => item.id === 'bot-user-id');
  assert.ok(botOverwrite);
  assert.ok(botOverwrite.allow.includes(PermissionFlagsBits.ManageChannels));

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].flags, MessageFlags.IsComponentsV2);
  assert.equal(sentMessages[0].content, undefined);
  assert.deepEqual(sentMessages[0].allowedMentions, {
    users: ['987654321098765432', '123456789012345678'],
    parse: [],
  });

  const text = getContainerText(sentMessages[0]);
  assert.match(text, /## 📅 Q3 Inventory Shrinkage Review/);
  assert.match(text, /Company: \*\*Monster Siomai\*\*/);
  assert.match(text, /### 📝 Agenda\nReview the Q3 inventory shrinkage numbers/);
  assert.match(text, /> \*\*Starts:\*\* July 15 at 10:00 AM/);
  assert.match(text, /> \*\*Duration:\*\* 45 minutes/);
  assert.match(text, /### 👥 Participants\n<@987654321098765432>/);
  assert.match(text, /Carl Anthony Camaya \(<@123456789012345678>\)/);
  assert.match(text, /\[Open in Omnilert\]\(https:\/\/app\.omnilert\.app/);
  assert.match(text, /-# Meeting ID: `dfb8ba84-5301-43c4-8d0d-3a175bd1b862`/);
});

test('buildMeetingChannelMessage dedupes participant mentions', () => {
  const message = buildMeetingChannelMessage(buildPayload(), [
    '987654321098765432',
    '987654321098765432',
  ]);

  assert.equal(getContainerText(message).match(/<@987654321098765432>/g).length, 1);
  assert.deepEqual(message.allowedMentions, {
    users: ['987654321098765432', '123456789012345678'],
    parse: [],
  });
});

test('buildMeetingChannelMessage keeps the creator mention pingable without duplicating it', () => {
  const message = buildMeetingChannelMessage(
    buildPayload({
      participants: [
        { user_id: 'creator-uuid', name: 'Carl Anthony Camaya', discord_user_id: '123456789012345678' },
      ],
    }),
    ['123456789012345678'],
  );

  assert.deepEqual(message.allowedMentions, {
    users: ['123456789012345678'],
    parse: [],
  });
});

test('buildMeetingChannelMessage falls back when agenda, participants, and link are missing', () => {
  const payload = buildPayload({ meeting: { agenda: '', link_url: '' } });
  const text = getContainerText(buildMeetingChannelMessage(payload, []));

  assert.match(text, /### 📝 Agenda\n_No agenda provided\._/);
  assert.match(text, /### 👥 Participants\n_No participants assigned\._/);
  assert.doesNotMatch(text, /Meeting Link/);
});

test('duplicate meeting id returns stored channel id without creating a channel', async () => {
  const { client, createdChannels, sentMessages } = createMockClient();
  const handler = createMeetingCreateChannelHandler({
    clientInstance: client,
    db: createMockDb([
      {
        meeting_id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862',
        voice_channel_id: 'existing-channel-id',
        guild_id: 'guild123',
      },
    ]),
    expectedToken: 'expected-token',
    guildId: 'guild123',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    voice_channel_id: 'existing-channel-id',
  });
  assert.equal(createdChannels.length, 0);
  assert.equal(sentMessages.length, 0);
});

test('handler returns 500 when Discord channel creation fails', async () => {
  const { client } = createMockClient({ createError: new Error('create failed') });
  const handler = createMeetingCreateChannelHandler({
    clientInstance: client,
    db: createMockDb(),
    expectedToken: 'expected-token',
    guildId: 'guild123',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await handler(
      { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
      res,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: 'Failed to process meeting channel webhook',
  });
});

test('handler returns 500 and deletes the incomplete channel when message send fails', async () => {
  const { client, createdChannels, deletedChannels } = createMockClient({
    sendError: new Error('send failed'),
  });
  const handler = createMeetingCreateChannelHandler({
    clientInstance: client,
    db: createMockDb(),
    expectedToken: 'expected-token',
    guildId: 'guild123',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await handler(
      { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
      res,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(createdChannels.length, 1);
  assert.deepEqual(deletedChannels, [
    {
      id: '1398472048572048',
      reason: 'Meeting webhook failed before completion',
    },
  ]);
});

test('shared meeting channel webhook handler dispatches delete events', async () => {
  const deletedChannels = [];
  const client = {
    channels: {
      cache: new Map([
        [
          '1398472048572048',
          {
            delete: async (reason) => {
              deletedChannels.push(reason);
            },
          },
        ],
      ]),
    },
  };
  const handler = createMeetingChannelWebhookHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler(
    {
      headers: { authorization: 'Bearer expected-token' },
      body: {
        event: 'meeting.delete_channel',
        version: 1,
        environment: 'development',
        sent_at: '2026-07-14T09:12:44.031Z',
        meeting: { id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862' },
        voice_channel_id: '1398472048572048',
        reason: 'cancelled',
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    voice_channel_id: '1398472048572048',
    deleted: true,
  });
  assert.deepEqual(deletedChannels, [
    'Meeting dfb8ba84-5301-43c4-8d0d-3a175bd1b862 cancelled from webhook',
  ]);
});

test('shared meeting channel webhook handler updates participant permissions', async () => {
  const edits = [];
  const deletes = [];
  const client = {
    channels: {
      cache: new Map([
        [
          '1398472048572048',
          {
            permissionOverwrites: {
              edit: async (id, options, extra) => {
                edits.push({ id, options, extra });
              },
              delete: async (id, reason) => {
                deletes.push({ id, reason });
              },
            },
          },
        ],
      ]),
    },
  };
  const handler = createMeetingChannelWebhookHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler(
    {
      headers: { authorization: 'Bearer expected-token' },
      body: {
        event: 'meeting.update_participants',
        version: 1,
        environment: 'production',
        sent_at: '2026-07-15T09:00:00.000Z',
        meeting: { id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862' },
        voice_channel_id: '1398472048572048',
        added: [
          { user_id: 'user-1', name: 'Ken Reyes', discord_user_id: '456' },
          { user_id: 'user-1', name: 'Ken Reyes', discord_user_id: '456' },
        ],
        removed: [{ user_id: 'user-2', name: 'Mia Santos', discord_user_id: '789' }],
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    voice_channel_id: '1398472048572048',
    updated: true,
    added: 1,
    removed: 1,
  });
  assert.deepEqual(edits, [
    {
      id: '456',
      options: {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        SendMessages: true,
        ReadMessageHistory: true,
      },
      extra: {
        reason: 'Meeting dfb8ba84-5301-43c4-8d0d-3a175bd1b862 participant added from webhook',
      },
    },
  ]);
  assert.deepEqual(deletes, [
    {
      id: '789',
      reason: 'Meeting dfb8ba84-5301-43c4-8d0d-3a175bd1b862 participant removed from webhook',
    },
  ]);
});

test('shared meeting channel webhook handler reports missing channel for participant updates', async () => {
  const client = {
    channels: {
      cache: new Map(),
      fetch: async () => null,
    },
  };
  const handler = createMeetingChannelWebhookHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    lockInstance: createNoopLock(),
  });
  const res = createMockRes();

  await handler(
    {
      headers: { authorization: 'Bearer expected-token' },
      body: {
        event: 'meeting.update_participants',
        version: 1,
        environment: 'production',
        sent_at: '2026-07-15T09:00:00.000Z',
        meeting: { id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862' },
        voice_channel_id: 'missing-channel-id',
        added: [{ user_id: 'user-1', name: 'Ken Reyes', discord_user_id: '456' }],
        removed: [],
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    voice_channel_id: 'missing-channel-id',
    updated: false,
    added: 0,
    removed: 0,
    reason: 'not-found',
  });
});
