const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildFailureSummary,
  createCronNotificationHandler,
  parseCronFailureDetails,
} = require('./cronNotifications');

function createResponseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createCronPayload(overrides = {}) {
  return {
    event: 'cron_job.run',
    version: 1,
    environment: 'production',
    sent_at: '2026-05-15T04:20:41.549Z',
    job: {
      name: 'shift-authorization-expiry',
      family: 'shift_authorization_expiry',
      schedule: '*/30 * * * *',
      trigger: 'scheduled',
    },
    run: {
      id: 'shift-authorization-expiry:scheduled:2026-05-15T04:20:35.912Z',
      scheduled_for_key: null,
      scheduled_for_manila: null,
      source: 'scheduled',
      started_at: '2026-05-15T04:20:35.912Z',
      finished_at: '2026-05-15T04:20:41.534Z',
      duration_ms: 5622,
      attempt: null,
    },
    result: {
      status: 'failed',
      message: 'Shift authorization expiry cron run failed',
      error_message: JSON.stringify({
        failed: 2,
        failures: [
          {
            entityType: 'shift_authorization',
            entityId: 'auth-1',
            error: 'Odoo request failed with 500',
          },
          {
            entityType: 'shift_authorization',
            entityId: 'auth-2',
            error: 'Database timeout',
          },
        ],
      }),
    },
    stats: {
      processed: 3,
      succeeded: 1,
      failed: 2,
      skipped: 0,
    },
    meta: {
      timezone: 'Asia/Manila',
    },
    ...overrides,
  };
}

test('parseCronFailureDetails parses structured cron failure JSON', () => {
  const details = parseCronFailureDetails(JSON.stringify({
    failed: 1,
    failures: [
      {
        entityType: 'company',
        entityId: 'company-1',
        error: 'peer evaluation update failed',
      },
    ],
  }));

  assert.deepEqual(details, {
    failed: 1,
    failures: [
      {
        entityType: 'company',
        entityId: 'company-1',
        error: 'peer evaluation update failed',
      },
    ],
    parsed: true,
  });
  assert.equal(buildFailureSummary(details), '1 failure(s); see thread for details');
});

test('parseCronFailureDetails falls back for legacy plain-string cron errors', () => {
  assert.deepEqual(parseCronFailureDetails('Failed processing 1 shifts'), {
    failed: 1,
    failures: [
      {
        entityType: 'cron_run',
        entityId: null,
        error: 'Failed processing 1 shifts',
      },
    ],
    parsed: false,
  });
});

test('createCronNotificationHandler creates a failure thread and sends one embed per failure', async () => {
  const threadSends = [];
  const startedThreads = [];
  const channelSends = [];
  const thread = {
    send: async (payload) => {
      threadSends.push(payload);
    },
  };
  const sentMessage = {
    startThread: async (input) => {
      startedThreads.push(input);
      return thread;
    },
  };
  const channel = {
    send: async (payload) => {
      channelSends.push(payload);
      return sentMessage;
    },
  };
  const clientInstance = {
    channels: {
      cache: {
        get: () => channel,
      },
    },
  };
  const handler = createCronNotificationHandler({
    clientInstance,
    expectedToken: 'secret',
    channelId: 'cron-channel',
  });
  const req = {
    body: createCronPayload(),
    get: (header) => (header === 'authorization' ? 'Bearer secret' : null),
  };
  const res = createResponseRecorder();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(channelSends.length, 1);
  assert.equal(startedThreads.length, 1);
  assert.equal(startedThreads[0].type, 11);
  assert.equal(startedThreads[0].autoArchiveDuration, 1440);
  assert.equal(threadSends.length, 2);
  assert.equal(threadSends[0].embeds.length, 1);
  assert.equal(threadSends[1].embeds.length, 1);
});
