const crypto = require('crypto');
const axios = require('axios');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const store = require('../utils/discordActivityStore');

const QUEUE_NAME = 'discord-activity-delivery';
const MAX_ATTEMPTS = 10;
const DELIVERED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

let producerConnection = null;
let queue = null;
let workerConnection = null;
let worker = null;

function isEnabled() {
  return String(process.env.DISCORD_ACTIVITY_LOG_ENABLED || '').toLowerCase() === 'true';
}

function redisOptions() {
  return {
    host: process.env.VALKEY_HOST || '127.0.0.1',
    port: parseInt(process.env.VALKEY_PORT || '6379', 10),
    password: process.env.VALKEY_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000,
    keepAlive: 30000,
    family: 4,
  };
}

function getQueue() {
  if (!queue) {
    producerConnection = new IORedis(redisOptions());
    producerConnection.on('error', (error) => {
      console.error('Discord activity queue connection error:', error.message);
    });
    queue = new Queue(QUEUE_NAME, {
      connection: producerConnection,
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: { type: 'activity-exponential' },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
  }
  return queue;
}

function jobIdForEvent(eventId) {
  return `activity-${crypto.createHash('sha256').update(eventId).digest('hex')}`;
}

async function enqueueDiscordActivity(eventId) {
  if (!isEnabled()) return null;
  const activityQueue = getQueue();
  const jobId = jobIdForEvent(eventId);
  const existing = await activityQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'completed' || state === 'failed') {
      await existing.remove();
    } else {
      return existing;
    }
  }

  const row = store.getActivity(eventId);
  const nextAttemptAt = row?.next_attempt_at ? Date.parse(row.next_attempt_at) : 0;
  const delay = Number.isFinite(nextAttemptAt) ? Math.max(0, nextAttemptAt - Date.now()) : 0;
  return activityQueue.add('deliver', { eventId }, { jobId, delay });
}

function createSignature(secret, timestamp, rawBody) {
  return `v1=${crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

function retryAfterMilliseconds(headers) {
  const value = headers?.['retry-after'];
  if (value === undefined || value === null) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds * 1000));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function isTransientStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function deliverActivity(eventId, { httpClient = axios } = {}) {
  const row = store.getActivity(eventId);
  if (!row || row.state === 'delivered' || row.state === 'failed') {
    return { skipped: true, state: row?.state || 'missing' };
  }
  if (row.state !== 'pending') return { skipped: true, state: row.state };

  const rawBody = JSON.stringify(row.payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await httpClient.post(process.env.DISCORD_ACTIVITY_WEBHOOK_URL, rawBody, {
    headers: {
      'Content-Type': 'application/json',
      'X-Omnilert-Event-Id': eventId,
      'X-Omnilert-Timestamp': timestamp,
      'X-Omnilert-Signature': createSignature(
        process.env.DISCORD_ACTIVITY_WEBHOOK_SECRET,
        timestamp,
        rawBody,
      ),
    },
    transformRequest: [(body) => body],
    timeout: 15000,
    validateStatus: () => true,
  });

  if ((response.status >= 200 && response.status < 300) || response.status === 409) {
    store.markActivityDelivered(eventId);
    return { delivered: true, status: response.status };
  }

  const error = new Error(`Activity webhook returned HTTP ${response.status}`);
  error.status = response.status;
  error.retryAfterMs = retryAfterMilliseconds(response.headers);
  error.permanent = !isTransientStatus(response.status);
  throw error;
}

async function processDelivery(job, deliveryOptions = {}) {
  const row = store.getActivity(job.data.eventId);
  if (!row || row.state !== 'pending') return { skipped: true };
  if (row.attempts >= MAX_ATTEMPTS) {
    store.markActivityFailed(job.data.eventId, 'Maximum delivery attempts exhausted');
    return { failed: true };
  }

  try {
    return await deliverActivity(job.data.eventId, deliveryOptions);
  } catch (error) {
    if (error.permanent || row.attempts + 1 >= MAX_ATTEMPTS) {
      store.markActivityFailed(job.data.eventId, error.message);
      return { failed: true, permanent: Boolean(error.permanent) };
    }

    const delay = error.retryAfterMs || Math.min(2000 * (2 ** row.attempts), 5 * 60 * 1000);
    store.markActivityAttempt(
      job.data.eventId,
      error.message,
      new Date(Date.now() + delay).toISOString(),
    );
    throw error;
  }
}

async function initializeDiscordActivityWorker() {
  if (!isEnabled()) return null;
  if (worker) return worker;

  const interruptedIds = store.recoverInterruptedCommands();
  const recoverableIds = [...new Set([...interruptedIds, ...store.listRecoverableActivities()])];
  workerConnection = new IORedis(redisOptions());
  workerConnection.on('error', (error) => {
    console.error('Discord activity worker connection error:', error.message);
  });
  worker = new Worker(QUEUE_NAME, processDelivery, {
    connection: workerConnection,
    concurrency: 5,
    settings: {
      backoffStrategy(attemptsMade, type, error) {
        if (type !== 'activity-exponential') return 0;
        return error?.retryAfterMs || Math.min(2000 * (2 ** Math.max(0, attemptsMade - 1)), 5 * 60 * 1000);
      },
    },
  });

  worker.on('failed', (job, error) => {
    console.error(`Discord activity job ${job?.data?.eventId || 'unknown'} failed:`, error.message);
  });
  worker.on('error', (error) => {
    console.error('Discord activity worker error:', error.message);
  });

  for (const eventId of recoverableIds) {
    await enqueueDiscordActivity(eventId);
  }

  store.cleanupDeliveredActivities(new Date(Date.now() - DELIVERED_RETENTION_MS).toISOString());
  console.log(`Discord activity worker started; recovered ${recoverableIds.length} event(s)`);
  return worker;
}

async function replayFailedDiscordActivity(eventId) {
  if (!store.requeueFailedActivity(eventId)) return false;
  await enqueueDiscordActivity(eventId);
  return true;
}

async function closeDiscordActivityQueue() {
  if (worker) await worker.close();
  if (queue) await queue.close();
  if (workerConnection) await workerConnection.quit();
  if (producerConnection) await producerConnection.quit();
  worker = null;
  queue = null;
  workerConnection = null;
  producerConnection = null;
}

module.exports = {
  closeDiscordActivityQueue,
  createSignature,
  deliverActivity,
  enqueueDiscordActivity,
  initializeDiscordActivityWorker,
  isTransientStatus,
  processDelivery,
  replayFailedDiscordActivity,
  retryAfterMilliseconds,
};
