const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');

const {
  isValidMeetingReschedulePayload,
  rescheduleMeetingVoiceChannel,
  buildMeetingRescheduleMessage,
} = require('../src/webhook/websiteRoutes/meetings/rescheduleChannel');

const {
  createMeetingChannelWebhookHandler,
  isValidMeetingChannelWebhookPayload,
} = require('../src/webhook/websiteRoutes/meetings/createChannel');

function buildPayload(overrides = {}) {
  const payload = {
    event: 'meeting.reschedule',
    version: 1,
    environment: 'development',
    sent_at: '2026-07-14T09:00:00.000Z',
    meeting: {
      id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862',
      title: 'Q3 Inventory Shrinkage Review',
    },
    voice_channel_id: '1398472048572048',
    previous_starts_at: '2026-07-15T02:00:00.000Z',
    starts_at: '2026-07-18T06:00:00.000Z',
    duration_minutes: 90,
    rescheduled_count: 2,
    link_url: 'https://app.omnilert.app/account/meetings?meetingId=dfb8ba84',
  };

  return {
    ...payload,
    ...overrides,
    meeting: { ...payload.meeting, ...(overrides.meeting || {}) },
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

function createMockClient({ channelId = '1398472048572048', useFetch = false, setNameError, sendError } = {}) {
  const renames = [];
  const sentMessages = [];

  const channel = {
    id: channelId,
    setName: async (name, reason) => {
      if (setNameError) throw setNameError;
      renames.push({ name, reason });
    },
    send: async (message) => {
      if (sendError) throw sendError;
      sentMessages.push(message);
      return { id: 'reschedule-message-id' };
    },
  };

  const client = {
    channels: {
      cache: new Map(useFetch ? [] : [[channelId, channel]]),
      fetch: async (id) => (id === channelId ? channel : null),
    },
  };

  return { client, channel, renames, sentMessages };
}

function getContainerText(message) {
  const container = message.components[0].toJSON();
  return (container.components || [])
    .map((component) => component.content)
    .filter((content) => typeof content === 'string')
    .join('\n');
}

test('isValidMeetingReschedulePayload accepts a valid payload', () => {
  assert.equal(isValidMeetingReschedulePayload(buildPayload()), true);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ link_url: null })), true);
});

test('isValidMeetingReschedulePayload rejects malformed payloads', () => {
  assert.equal(isValidMeetingReschedulePayload(null), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ event: 'nope' })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ version: '1' })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ meeting: { id: '' } })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ meeting: { title: '' } })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ voice_channel_id: '' })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ previous_starts_at: '' })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ starts_at: '' })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ duration_minutes: '90' })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ rescheduled_count: '2' })), false);
  assert.equal(isValidMeetingReschedulePayload(buildPayload({ link_url: '' })), false);
});

test('isValidMeetingChannelWebhookPayload accepts reschedule events', () => {
  assert.equal(isValidMeetingChannelWebhookPayload(buildPayload()), true);
});

test('buildMeetingRescheduleMessage shows old and new Manila times, duration, and count', () => {
  const message = buildMeetingRescheduleMessage(buildPayload());

  assert.equal(message.flags, MessageFlags.IsComponentsV2);

  const text = getContainerText(message);
  assert.match(text, /## 🔄 Meeting Rescheduled/);
  assert.match(text, /Q3 Inventory Shrinkage Review/);
  assert.match(text, /~~July 15 at 10:00 AM~~/);
  assert.match(text, /\*\*July 18 at 2:00 PM\*\*/);
  assert.match(text, /1 hour 30 minutes/);
  assert.match(text, /Rescheduled 2 times/);
  assert.match(text, /\[Open in Omnilert\]\(https:\/\/app\.omnilert\.app/);
});

test('buildMeetingRescheduleMessage omits the link section when link_url is null', () => {
  const text = getContainerText(buildMeetingRescheduleMessage(buildPayload({ link_url: null })));
  assert.doesNotMatch(text, /Meeting Link/);
});

test('rescheduleMeetingVoiceChannel renames the channel with the new start time and posts a message', async () => {
  const { client, renames, sentMessages } = createMockClient();

  const result = await rescheduleMeetingVoiceChannel({ clientInstance: client, payload: buildPayload() });

  assert.deepEqual(result, { rescheduled: true });
  assert.equal(renames.length, 1);
  assert.equal(renames[0].name, 'Jul 18, 2:00 PM | Q3 Inventory Shrinkage Review');
  assert.match(renames[0].reason, /dfb8ba84-5301-43c4-8d0d-3a175bd1b862/);
  assert.equal(sentMessages.length, 1);
  assert.match(getContainerText(sentMessages[0]), /## 🔄 Meeting Rescheduled/);
});

test('rescheduleMeetingVoiceChannel reports a missing channel without throwing', async () => {
  const { client, renames } = createMockClient({ useFetch: true });
  client.channels.fetch = async () => null;

  const result = await rescheduleMeetingVoiceChannel({ clientInstance: client, payload: buildPayload() });

  assert.deepEqual(result, { rescheduled: false, reason: 'not-found' });
  assert.equal(renames.length, 0);
});

test('handler returns 401 when authorization is missing or wrong', async () => {
  const { client } = createMockClient();
  const handler = createMeetingChannelWebhookHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler({ headers: {}, body: buildPayload() }, res);

  assert.equal(res.statusCode, 401);
});

test('handler returns 400 for an invalid reschedule payload', async () => {
  const { client } = createMockClient();
  const handler = createMeetingChannelWebhookHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload({ starts_at: '' }) },
    res,
  );

  assert.equal(res.statusCode, 400);
});

test('shared meeting channel webhook handler dispatches reschedule events', async () => {
  const { client, renames, sentMessages } = createMockClient();
  const handler = createMeetingChannelWebhookHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
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
    rescheduled: true,
  });
  assert.equal(renames.length, 1);
  assert.equal(sentMessages.length, 1);
});

test('shared meeting channel webhook handler reports a missing channel for reschedule', async () => {
  const client = {
    channels: {
      cache: new Map(),
      fetch: async () => null,
    },
  };
  const handler = createMeetingChannelWebhookHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
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
    rescheduled: false,
    reason: 'not-found',
  });
});
