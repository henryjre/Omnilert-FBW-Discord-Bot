const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ApplicationCommandOptionType, AuditLogEvent, ChannelType } = require('discord.js');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-activity-'));
process.env.SQLITE_DB_PATH = path.join(temporaryDirectory, 'activity.sqlite');
process.env.DISCORD_ACTIVITY_LOG_ENABLED = 'true';
process.env.node_env = 'test';
process.env.testGuildId = 'guild-1';
process.env.DISCORD_ACTIVITY_WEBHOOK_URL = 'https://example.test/activity';
process.env.DISCORD_ACTIVITY_WEBHOOK_SECRET = 'activity-secret';

const queuedEventIds = [];
const queuePath = require.resolve('../src/queue/discordActivityQueue');
require.cache[queuePath] = {
  id: queuePath,
  filename: queuePath,
  loaded: true,
  exports: {
    enqueueDiscordActivity: async (eventId) => queuedEventIds.push(eventId),
  },
};

const db = require('../src/sqliteConnection');
const store = require('../src/utils/discordActivityStore');
const activity = require('../src/utils/discordActivity');

function makeChannel(id = 'channel-1', type = ChannelType.GuildText, name = 'general') {
  return {
    id,
    type,
    name,
    parentId: null,
    isThread: () => false,
  };
}

function makeMessage(overrides = {}) {
  const channel = overrides.channel || makeChannel();
  return {
    id: 'message-1',
    guildId: 'guild-1',
    channelId: channel.id,
    channel,
    author: { id: 'user-1', bot: false },
    content: 'Original content',
    attachments: new Map([
      ['attachment-1', {
        id: 'attachment-1',
        name: 'report.pdf',
        contentType: 'application/pdf',
        size: 1234,
        url: 'https://cdn.discord.test/report.pdf',
      }],
    ]),
    reference: null,
    createdTimestamp: Date.parse('2026-09-20T01:00:00.000Z'),
    editedTimestamp: null,
    partial: false,
    webhookId: null,
    ...overrides,
  };
}

test.after(() => {
  db.close();
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test.beforeEach(() => {
  db.exec('DELETE FROM discord_message_snapshots; DELETE FROM discord_activity_outbox; DELETE FROM announcement_acknowledgments;');
  queuedEventIds.length = 0;
});

test('message creation, edit, and deletion retain complete history', async () => {
  const original = makeMessage();
  activity.captureMessageCreated(original);

  const created = store.getActivity('discord-message-created:message-1');
  assert.equal(created.payload.type, 'discord.message.created');
  assert.deepEqual(created.payload.actor, {
    discord_user_id: 'user-1',
    username: null,
    display_name: null,
  });
  assert.equal(created.payload.context.channel_name, 'general');
  assert.deepEqual(created.payload.log.location, {
    channel_id: 'channel-1',
    channel_name: 'general',
    channel_type: 'text',
    parent_channel_id: null,
    parent_channel_name: null,
    message_url: 'https://discord.com/channels/guild-1/channel-1/message-1',
  });
  assert.equal(created.payload.content.message.content, 'Original content');
  assert.deepEqual(created.payload.content.message.attachments[0], {
    id: 'attachment-1',
    filename: 'report.pdf',
    content_type: 'application/pdf',
    size: 1234,
    url: 'https://cdn.discord.test/report.pdf',
  });

  const edited = makeMessage({
    content: 'Edited content',
    editedTimestamp: Date.parse('2026-09-20T01:05:00.000Z'),
  });
  await activity.captureMessageEdited(original, edited);

  const editedEvent = store.getActivity('discord-message-edited:message-1:2');
  assert.equal(editedEvent.payload.content.before.content, 'Original content');
  assert.equal(editedEvent.payload.content.after.content, 'Edited content');
  assert.equal(editedEvent.payload.content.after.revision, 2);

  activity.captureMessageDeleted({
    id: 'message-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    channel: makeChannel(),
    partial: true,
  });
  const deleted = store.getActivity('discord-message-deleted:message-1');
  assert.equal(deleted.payload.content.content_available, true);
  assert.equal(deleted.payload.content.before.content, 'Edited content');
  assert.equal(store.getMessageSnapshot('message-1'), null);
});

test('channel context includes readable channel and parent names', () => {
  const parent = { id: 'category-1', name: 'Operations' };
  assert.deepEqual(activity.channelContext({
    id: 'channel-1',
    name: 'daily-standup',
    type: ChannelType.GuildText,
    parentId: parent.id,
    parent,
    isThread: () => false,
  }), {
    channel_id: 'channel-1',
    channel_name: 'daily-standup',
    channel_type: 'text',
    parent_channel_id: 'category-1',
    parent_channel_name: 'Operations',
  });
});

test('bot and webhook messages are not captured', () => {
  assert.equal(activity.captureMessageCreated(makeMessage({ author: { id: 'bot', bot: true } })), null);
  assert.equal(activity.captureMessageCreated(makeMessage({ webhookId: 'webhook-1' })), null);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM discord_activity_outbox').get().count, 0);
});

test('voice transitions emit joined, moved, and left once each', () => {
  const member = { id: 'user-1', user: { id: 'user-1', bot: false } };
  const guild = { id: 'guild-1' };
  const voiceOne = makeChannel('voice-1', ChannelType.GuildVoice);
  const voiceTwo = makeChannel('voice-2', ChannelType.GuildVoice);

  assert.equal(activity.captureVoiceState(
    { guild, member, id: 'user-1', channelId: null, channel: null },
    { guild, member, id: 'user-1', channelId: 'voice-1', channel: voiceOne },
  ).type, 'discord.voice.joined');
  assert.equal(activity.captureVoiceState(
    { guild, member, id: 'user-1', channelId: 'voice-1', channel: voiceOne },
    { guild, member, id: 'user-1', channelId: 'voice-2', channel: voiceTwo },
  ).type, 'discord.voice.moved');
  assert.equal(activity.captureVoiceState(
    { guild, member, id: 'user-1', channelId: 'voice-2', channel: voiceTwo },
    { guild, member, id: 'user-1', channelId: null, channel: null },
  ).type, 'discord.voice.left');
});

test('audit entries map channel, kick, and ban actions with actor and reason', () => {
  const guild = { id: 'guild-1' };
  const channelEvent = activity.captureAuditLogEntry({
    id: 'audit-channel',
    action: AuditLogEvent.ChannelCreate,
    targetId: 'channel-2',
    target: { id: 'channel-2', name: 'new-channel', type: ChannelType.GuildText },
    executorId: 'moderator-1',
    reason: 'Company project',
    createdAt: new Date('2026-09-20T02:00:00.000Z'),
  }, guild);
  assert.equal(channelEvent.type, 'discord.channel.created');
  assert.equal(channelEvent.actor.discord_user_id, 'moderator-1');

  assert.equal(activity.captureAuditLogEntry({
    id: 'audit-kick',
    action: AuditLogEvent.MemberKick,
    targetId: 'user-2',
    executorId: 'moderator-1',
  }, guild).type, 'discord.member.kicked');
  assert.equal(activity.captureAuditLogEntry({
    id: 'audit-ban',
    action: AuditLogEvent.MemberBanAdd,
    targetId: 'user-3',
    executorId: 'moderator-1',
  }, guild).type, 'discord.member.banned');
});

test('slash command options are minimized and outcomes finalize one event', () => {
  const interaction = {
    id: 'interaction-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    channel: makeChannel(),
    commandName: 'request',
    createdAt: new Date('2026-09-20T03:00:00.000Z'),
    user: { id: 'user-1' },
    options: {
      data: [
        { name: 'authorization', type: ApplicationCommandOptionType.Subcommand, options: [
          { name: 'employee', type: ApplicationCommandOptionType.User, value: 'user-2' },
          { name: 'reason', type: ApplicationCommandOptionType.String, value: 'Business purpose' },
        ] },
      ],
      getSubcommandGroup: () => null,
      getSubcommand: () => 'authorization',
      resolved: {},
    },
  };

  const capture = activity.beginSlashCommandActivity(interaction);
  let row = store.getActivity('discord-command:interaction-1');
  assert.equal(row.state, 'capturing');
  assert.deepEqual(row.payload.content.options[0].value[0].value, { discord_id: 'user-2' });

  activity.finishSlashCommandActivity(capture, 'failed', Object.assign(new Error('secret text'), { code: 'E_COMMAND' }));
  row = store.getActivity('discord-command:interaction-1');
  assert.equal(row.state, 'pending');
  assert.equal(row.payload.content.outcome, 'failed');
  assert.equal(row.payload.content.failure_code, 'E_COMMAND');
  assert.equal(row.payload.log.details.outcome, 'failed');
  assert.equal(row.payload.log.details.failure_code, 'E_COMMAND');
  assert.equal(JSON.stringify(row.payload).includes('secret text'), false);
});

test('unfinished slash commands recover as interrupted', () => {
  const event = activity.makeEnvelope({
    id: 'discord-command:interrupted',
    type: 'discord.slash_command.invoked',
    occurredAt: '2026-09-20T03:00:00.000Z',
    guildId: 'guild-1',
    content: { command: 'test', outcome: null },
  });
  store.insertActivity(event, 'capturing');
  const recovered = store.recoverInterruptedCommands('2026-09-20T03:00:05.000Z');
  assert.deepEqual(recovered, ['discord-command:interrupted']);
  assert.equal(store.getActivity(event.id).payload.content.outcome, 'interrupted');
});

test('announcement acknowledgment and outbox insertion are atomic and deduplicated', () => {
  db.prepare(`
    INSERT INTO announcement_acknowledgments
      (announcement_id, channel_id, thread_id, expected_users, acknowledged_users, timeout_minutes)
    VALUES (?, ?, ?, ?, '[]', 5)
  `).run('announcement-1', 'channel-1', 'thread-1', JSON.stringify(['user-1']));

  const interaction = {
    guildId: 'guild-1',
    user: { id: 'user-1' },
    message: {
      id: 'announcement-1',
      guildId: 'guild-1',
      channelId: 'channel-1',
      channel: makeChannel(),
      content: 'Important announcement',
      embeds: [],
    },
  };

  const first = activity.recordAnnouncementAcknowledgmentActivity(interaction);
  const duplicate = activity.recordAnnouncementAcknowledgmentActivity(interaction);
  assert.equal(first.recorded, true);
  assert.equal(duplicate.reason, 'duplicate');

  const eventId = 'discord-announcement-acknowledged:announcement-1:user-1';
  const row = store.getActivity(eventId);
  assert.equal(row.payload.content.announcement_title, 'Important announcement');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM discord_activity_outbox WHERE event_id = ?').get(eventId).count, 1);
});

test('HMAC signature format matches the documented contract', () => {
  delete require.cache[queuePath];
  const { createSignature, isTransientStatus } = require('../src/queue/discordActivityQueue');
  const timestamp = '1700000000';
  const body = '{"id":"event-1"}';
  const expected = crypto.createHmac('sha256', 'activity-secret')
    .update(`${timestamp}.${body}`)
    .digest('hex');
  assert.equal(createSignature('activity-secret', timestamp, body), `v1=${expected}`);
  assert.equal(isTransientStatus(429), true);
  assert.equal(isTransientStatus(503), true);
  assert.equal(isTransientStatus(400), false);
});

test('delivery sends the exact signed body and treats duplicate 409 as success', async () => {
  const { deliverActivity } = require('../src/queue/discordActivityQueue');
  const event = activity.makeEnvelope({
    id: 'delivery-event',
    type: 'discord.message.created',
    guildId: 'guild-1',
  });
  store.insertActivity(event);

  const requests = [];
  const result = await deliverActivity(event.id, {
    httpClient: {
      post: async (url, body, options) => {
        requests.push({ url, body, options });
        return { status: 409, headers: {} };
      },
    },
  });

  assert.equal(result.delivered, true);
  assert.equal(requests[0].url, process.env.DISCORD_ACTIVITY_WEBHOOK_URL);
  assert.equal(requests[0].body, JSON.stringify(event));
  assert.equal(requests[0].options.headers['X-Omnilert-Event-Id'], event.id);
  assert.match(requests[0].options.headers['X-Omnilert-Signature'], /^v1=[a-f0-9]{64}$/);
  assert.equal(store.getActivity(event.id).state, 'delivered');
});

test('delivery classifies permanent and retryable HTTP failures', async () => {
  const { deliverActivity } = require('../src/queue/discordActivityQueue');
  for (const [eventId, status, permanent] of [
    ['bad-request-event', 400, true],
    ['rate-limit-event', 429, false],
  ]) {
    store.insertActivity(activity.makeEnvelope({
      id: eventId,
      type: 'discord.message.created',
      guildId: 'guild-1',
    }));
    await assert.rejects(
      deliverActivity(eventId, {
        httpClient: { post: async () => ({ status, headers: { 'retry-after': '2' } }) },
      }),
      (error) => error.status === status && error.permanent === permanent,
    );
  }
});

test('worker persists retry attempts and permanently fails non-retryable responses', async () => {
  const { processDelivery } = require('../src/queue/discordActivityQueue');
  for (const eventId of ['retry-worker-event', 'permanent-worker-event']) {
    store.insertActivity(activity.makeEnvelope({
      id: eventId,
      type: 'discord.message.created',
      guildId: 'guild-1',
    }));
  }

  await assert.rejects(processDelivery(
    { data: { eventId: 'retry-worker-event' } },
    { httpClient: { post: async () => ({ status: 503, headers: {} }) } },
  ));
  const retryRow = store.getActivity('retry-worker-event');
  assert.equal(retryRow.state, 'pending');
  assert.equal(retryRow.attempts, 1);
  assert.ok(retryRow.next_attempt_at);

  const failed = await processDelivery(
    { data: { eventId: 'permanent-worker-event' } },
    { httpClient: { post: async () => ({ status: 422, headers: {} }) } },
  );
  assert.equal(failed.failed, true);
  assert.equal(failed.permanent, true);
  assert.equal(store.getActivity('permanent-worker-event').state, 'failed');
});
