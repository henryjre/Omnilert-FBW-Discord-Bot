const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMeetingDeleteChannelHandler,
  isValidMeetingDeleteChannelPayload,
} = require('../src/webhook/websiteRoutes/meetings/deleteChannel');

function buildPayload(overrides = {}) {
  const payload = {
    event: 'meeting.delete_channel',
    version: 1,
    environment: 'development',
    sent_at: '2026-07-14T09:12:44.031Z',
    meeting: { id: 'dfb8ba84-5301-43c4-8d0d-3a175bd1b862' },
    voice_channel_id: '1398472048572048',
    reason: 'cancelled',
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

function createMockClient({
  channelId = '1398472048572048',
  useFetch = false,
  fetchError,
  deleteError,
} = {}) {
  const deletedChannels = [];
  const fetchedChannels = [];
  const channel = {
    id: channelId,
    delete: async (reason) => {
      if (deleteError) throw deleteError;
      deletedChannels.push({ id: channelId, reason });
    },
  };

  const client = {
    channels: {
      cache: new Map(useFetch ? [] : [[channelId, channel]]),
      fetch: async (id) => {
        fetchedChannels.push(id);
        if (fetchError) throw fetchError;
        return id === channelId ? channel : null;
      },
    },
  };

  return { client, deletedChannels, fetchedChannels };
}

test('isValidMeetingDeleteChannelPayload accepts a valid payload', () => {
  assert.equal(isValidMeetingDeleteChannelPayload(buildPayload()), true);
  assert.equal(
    isValidMeetingDeleteChannelPayload(buildPayload({ reason: 'completed' })),
    true,
  );
});

test('isValidMeetingDeleteChannelPayload rejects malformed payloads', () => {
  assert.equal(isValidMeetingDeleteChannelPayload(null), false);
  assert.equal(isValidMeetingDeleteChannelPayload(buildPayload({ event: 'nope' })), false);
  assert.equal(isValidMeetingDeleteChannelPayload(buildPayload({ meeting: { id: '' } })), false);
  assert.equal(isValidMeetingDeleteChannelPayload(buildPayload({ voice_channel_id: '' })), false);
  assert.equal(isValidMeetingDeleteChannelPayload(buildPayload({ reason: 'expired' })), false);
});

test('handler returns 401 when authorization is missing or wrong', async () => {
  const { client } = createMockClient();
  const handler = createMeetingDeleteChannelHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler({ headers: {}, body: buildPayload() }, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: 'Unauthorized' });
});

test('handler returns 400 for an invalid payload', async () => {
  const { client } = createMockClient();
  const handler = createMeetingDeleteChannelHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload({ reason: 'expired' }) },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, message: 'Invalid payload' });
});

test('handler deletes a cached Discord voice channel', async () => {
  const { client, deletedChannels, fetchedChannels } = createMockClient();
  const handler = createMeetingDeleteChannelHandler({
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
    deleted: true,
  });
  assert.deepEqual(fetchedChannels, []);
  assert.deepEqual(deletedChannels, [
    {
      id: '1398472048572048',
      reason: 'Meeting dfb8ba84-5301-43c4-8d0d-3a175bd1b862 cancelled from webhook',
    },
  ]);
});

test('handler fetches and deletes a channel when it is not cached', async () => {
  const { client, deletedChannels, fetchedChannels } = createMockClient({ useFetch: true });
  const handler = createMeetingDeleteChannelHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
  });
  const res = createMockRes();

  await handler(
    {
      headers: { authorization: 'Bearer expected-token' },
      body: buildPayload({ reason: 'completed' }),
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    voice_channel_id: '1398472048572048',
    deleted: true,
  });
  assert.deepEqual(fetchedChannels, ['1398472048572048']);
  assert.deepEqual(deletedChannels, [
    {
      id: '1398472048572048',
      reason: 'Meeting dfb8ba84-5301-43c4-8d0d-3a175bd1b862 completed from webhook',
    },
  ]);
});

test('handler treats an already missing channel as an idempotent success', async () => {
  const { client } = createMockClient({
    useFetch: true,
    fetchError: { code: 10003, status: 404 },
  });
  const handler = createMeetingDeleteChannelHandler({
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
    deleted: false,
    reason: 'not-found',
  });
});

test('handler returns 500 when Discord deletion fails', async () => {
  const { client } = createMockClient({ deleteError: new Error('delete failed') });
  const handler = createMeetingDeleteChannelHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
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
    message: 'Failed to delete meeting voice channel',
  });
});
