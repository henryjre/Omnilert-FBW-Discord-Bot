const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');

const {
  createCronNotificationHandler,
  extractBearerToken,
  isValidCronPayload,
} = require('../src/webhook/websiteRoutes/notifications/cronNotifications');

function buildPayload(overrides = {}) {
  const payload = {
    event: 'cron_job.run',
    version: 1,
    environment: 'production',
    sent_at: '2026-03-30T00:27:01.300Z',
    job: {
      name: 'compliance_hourly_audit',
      family: 'compliance',
      schedule: 'hourly@deterministic-minute',
      trigger: 'scheduled',
    },
    run: {
      id: 'compliance_hourly_audit:scheduled:2026-03-30T08:27',
      scheduled_for_key: '2026-03-30T08:27',
      scheduled_for_manila: '2026-03-30 08:27:00',
      source: 'scheduled',
      started_at: '2026-03-30T00:27:00.100Z',
      finished_at: '2026-03-30T00:27:01.241Z',
      duration_ms: 1141,
      attempt: 1,
    },
    result: {
      status: 'success',
      message: 'Completed compliance cron occurrence',
      error_message: null,
    },
    stats: {
      processed: null,
      succeeded: null,
      failed: null,
      skipped: null,
    },
    meta: {
      timezone: 'Asia/Manila',
    },
  };

  return {
    ...payload,
    ...overrides,
    job: { ...payload.job, ...(overrides.job || {}) },
    run: { ...payload.run, ...(overrides.run || {}) },
    result: { ...payload.result, ...(overrides.result || {}) },
    stats: { ...payload.stats, ...(overrides.stats || {}) },
    meta: { ...payload.meta, ...(overrides.meta || {}) },
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

function createMockClient(channel) {
  return {
    channels: {
      cache: new Map(channel ? [['1487864900947542209', channel]] : []),
      fetch: async () => channel,
    },
  };
}

test('extractBearerToken returns token for valid Bearer auth header', () => {
  assert.equal(extractBearerToken('Bearer abc123'), 'abc123');
});

test('extractBearerToken returns null for invalid header', () => {
  assert.equal(extractBearerToken('Basic abc123'), null);
  assert.equal(extractBearerToken('Bearer'), null);
  assert.equal(extractBearerToken(undefined), null);
});

test('isValidCronPayload returns true for a valid payload', () => {
  assert.equal(isValidCronPayload(buildPayload()), true);
});

test('isValidCronPayload returns false for malformed payload', () => {
  assert.equal(isValidCronPayload(buildPayload({ result: { status: null } })), false);
  assert.equal(isValidCronPayload(buildPayload({ job: { name: null } })), false);
  assert.equal(isValidCronPayload(null), false);
});

test('handler returns 401 when authorization is missing', async () => {
  const channel = { send: async () => {} };
  const handler = createCronNotificationHandler({
    clientInstance: createMockClient(channel),
    expectedToken: 'expected-token',
    channelId: '1487864900947542209',
  });
  const req = { headers: {}, body: buildPayload() };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { ok: false, message: 'Unauthorized' });
});

test('handler returns 400 when payload is invalid', async () => {
  const channel = { send: async () => {} };
  const handler = createCronNotificationHandler({
    clientInstance: createMockClient(channel),
    expectedToken: 'expected-token',
    channelId: '1487864900947542209',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload({ event: null }),
  };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { ok: false, message: 'Invalid payload' });
});

test('handler sends Components V2 summary without mention for success payload', async () => {
  const sentMessages = [];
  const channel = {
    send: async (payload) => {
      sentMessages.push(payload);
    },
  };
  const handler = createCronNotificationHandler({
    clientInstance: createMockClient(channel),
    expectedToken: 'expected-token',
    channelId: '1487864900947542209',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload(),
  };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, message: 'Cron notification sent' });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].flags, MessageFlags.IsComponentsV2);
  assert.equal(Array.isArray(sentMessages[0].components), true);
  assert.equal(sentMessages[0].content, undefined);

  const containerJson = sentMessages[0].components[0].toJSON();
  const allTextContent = containerJson.components
    .filter((component) => component.type === 10)
    .map((component) => component.content)
    .join('\n');

  assert.match(allTextContent, /\*\*Sent At:\*\* `March 30, 2026 at 8:27 AM`/);
  assert.match(allTextContent, /\*\*Scheduled Manila:\*\* March 30, 2026 at 8:27 AM/);
  assert.match(allTextContent, /\*\*Started At:\*\* March 30, 2026 at 8:27 AM/);
  assert.match(allTextContent, /\*\*Finished At:\*\* March 30, 2026 at 8:27 AM/);
});

test('handler sends mention when status is non-success', async () => {
  const sentMessages = [];
  const channel = {
    send: async (payload) => {
      sentMessages.push(payload);
    },
  };
  const handler = createCronNotificationHandler({
    clientInstance: createMockClient(channel),
    expectedToken: 'expected-token',
    channelId: '1487864900947542209',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload({ result: { status: 'error', error_message: 'boom' } }),
  };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].content, '<@748568303219245117>');
  assert.deepEqual(sentMessages[0].allowedMentions, {
    users: ['748568303219245117'],
    parse: [],
  });
});

test('handler returns 500 when send fails', async () => {
  const channel = {
    send: async () => {
      throw new Error('send failed');
    },
  };
  const handler = createCronNotificationHandler({
    clientInstance: createMockClient(channel),
    expectedToken: 'expected-token',
    channelId: '1487864900947542209',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload(),
  };
  const res = createMockRes();

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await handler(req, res);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { ok: false, message: 'Failed to send cron notification' });
});
