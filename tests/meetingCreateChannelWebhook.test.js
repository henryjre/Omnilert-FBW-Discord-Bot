const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const {
  MEETING_VOICE_CATEGORY_ID,
  buildMeetingChannelMessage,
  createMeetingChannelWebhookHandler,
  createMeetingCreateChannelHandler,
  isValidMeetingCreateChannelPayload,
  isValidMeetingChannelWebhookPayload,
  normalizeChannelName,
} = require('../src/webhook/websiteRoutes/meetings/createChannel');

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
      branch_id: 'branch-uuid',
      branch_name: 'MS Main Branch',
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
  assert.equal(isValidMeetingChannelWebhookPayload({ event: 'meeting.unknown' }), false);
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
  assert.equal(sentMessages[0].content, '<@987654321098765432>');
  assert.deepEqual(sentMessages[0].allowedMentions, {
    users: ['987654321098765432'],
    parse: [],
  });

  const embed = sentMessages[0].embeds[0].toJSON();
  assert.equal(embed.title, 'Q3 Inventory Shrinkage Review');
  assert.match(JSON.stringify(embed.fields), /MS Main Branch/);
  assert.match(JSON.stringify(embed.fields), /Carl Anthony Camaya/);
});

test('buildMeetingChannelMessage dedupes participant mentions', () => {
  const message = buildMeetingChannelMessage(buildPayload(), [
    '987654321098765432',
    '987654321098765432',
  ]);

  assert.equal(message.content, '<@987654321098765432>');
  assert.deepEqual(message.allowedMentions, {
    users: ['987654321098765432'],
    parse: [],
  });
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
