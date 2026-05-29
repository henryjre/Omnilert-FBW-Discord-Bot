const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');

const {
  USE_SEND_LOG_CHANNEL_ID,
  buildUseSendWebhookContainer,
  createUseSendWebhookHandler,
  isValidUseSendPayload,
} = require('../src/webhook/websiteRoutes/notifications/useSend');

function buildPayload(overrides = {}) {
  const payload = {
    id: 'cmpr1o36e000qpb2v7tyze40u',
    type: 'webhook.test',
    version: '2026-01-18',
    createdAt: '2026-05-29T14:55:58.742Z',
    teamId: 1,
    data: {
      test: true,
      webhookId: 'cmpr1n7kb000opb2v1tq8a72s',
      sentAt: '2026-05-29T14:55:58.741Z',
    },
    attempt: 4,
  };

  return {
    ...payload,
    ...overrides,
    data: Object.prototype.hasOwnProperty.call(overrides, 'data')
      ? overrides.data
      : payload.data,
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
      cache: new Map(channel ? [[USE_SEND_LOG_CHANNEL_ID, channel]] : []),
      fetch: async () => channel,
    },
  };
}

test('isValidUseSendPayload accepts useSend webhook payload', () => {
  assert.equal(isValidUseSendPayload(buildPayload()), true);
});

test('isValidUseSendPayload rejects malformed payloads', () => {
  assert.equal(isValidUseSendPayload(buildPayload({ id: '' })), false);
  assert.equal(isValidUseSendPayload(buildPayload({ teamId: '1' })), false);
  assert.equal(isValidUseSendPayload(buildPayload({ data: null })), false);
  assert.equal(isValidUseSendPayload(null), false);
});

test('buildUseSendWebhookContainer includes payload details', () => {
  const containerJson = buildUseSendWebhookContainer(buildPayload()).toJSON();
  const allTextContent = containerJson.components
    .filter((component) => component.type === 10)
    .map((component) => component.content)
    .join('\n');

  assert.match(allTextContent, /useSend Webhook/);
  assert.match(allTextContent, /webhook\.test/);
  assert.match(allTextContent, /cmpr1o36e000qpb2v7tyze40u/);
  assert.match(allTextContent, /cmpr1n7kb000opb2v1tq8a72s/);
  assert.match(allTextContent, /```json/);
});

test('handler sends Components V2 payload to useSend log channel and returns 200', async () => {
  const sentMessages = [];
  const channel = {
    send: async (payload) => {
      sentMessages.push(payload);
    },
  };
  const handler = createUseSendWebhookHandler({
    clientInstance: createMockClient(channel),
    channelId: USE_SEND_LOG_CHANNEL_ID,
  });
  const req = { headers: {}, body: buildPayload() };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, message: 'useSend webhook logged' });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].flags, MessageFlags.IsComponentsV2);
  assert.equal(Array.isArray(sentMessages[0].components), true);
  assert.equal(sentMessages[0].content, undefined);
});

test('handler returns 400 when payload is invalid', async () => {
  const sentMessages = [];
  const channel = {
    send: async (payload) => {
      sentMessages.push(payload);
    },
  };
  const handler = createUseSendWebhookHandler({
    clientInstance: createMockClient(channel),
    channelId: USE_SEND_LOG_CHANNEL_ID,
  });
  const req = { headers: {}, body: buildPayload({ type: '' }) };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { ok: false, message: 'Invalid payload' });
  assert.equal(sentMessages.length, 0);
});
