const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const db = require('../sqliteConnection.js');

// Create Valkey connection
const connection = new IORedis({
  host: process.env.VALKEY_HOST || '127.0.0.1',
  port: parseInt(process.env.VALKEY_PORT || '6379'),
  password: process.env.VALKEY_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
  connectTimeout: 10000,
  keepAlive: 30000,
  family: 4,
  retryStrategy(times) {
    if (times > 5) {
      console.error('Failed to connect to Valkey for portal notification cleanup queue after 5 attempts.');
      return null;
    }
    const delay = Math.min(times * 500, 3000);
    console.log(`Retrying Valkey connection for portal notification cleanup queue (attempt ${times}/5) in ${delay}ms...`);
    return delay;
  },
});

connection.on('connect', () => {
  console.log('✓ Connected to Valkey for portal notification cleanup queue');
});

connection.on('error', (err) => {
  console.error('✗ Valkey connection error (portal notification cleanup):', err.message);
});

// Create queue for portal notification cleanup
const portalNotificationCleanupQueue = new Queue('portal-notification-cleanup', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
    },
  },
});

let worker = null;

function initializePortalNotificationCleanupWorker(client) {
  if (worker) {
    console.log('Portal notification cleanup worker already initialized');
    return worker;
  }

  worker = new Worker(
    'portal-notification-cleanup',
    async () => {
      // Find delivered DM notifications older than 24 hours.
      const expired = db
        .prepare(
          `
          SELECT notification_id, dm_channel_id, message_id
          FROM portal_notifications
          WHERE message_id IS NOT NULL
            AND created_at IS NOT NULL
            AND created_at <= datetime('now', '-24 hours')
        `
        )
        .all();

      if (expired.length === 0) {
        return { success: true, deleted: 0 };
      }

      let deleted = 0;

      for (const row of expired) {
        // Best-effort delete the DM message; swallow per-message errors
        // (message may already be gone / channel unreachable).
        if (row.dm_channel_id && row.message_id) {
          try {
            const channel = await client.channels.fetch(row.dm_channel_id);
            await channel.messages.delete(row.message_id);
          } catch (error) {
            console.error(
              `Failed to delete expired DM notification message ${row.message_id}:`,
              error.message
            );
          }
        }

        db.prepare('DELETE FROM portal_notifications WHERE notification_id = ?').run(
          row.notification_id
        );
        deleted += 1;
      }

      console.log(`✓ Portal notification cleanup removed ${deleted} expired notification(s)`);

      return { success: true, deleted };
    },
    {
      connection: new IORedis({
        host: process.env.VALKEY_HOST || '127.0.0.1',
        port: parseInt(process.env.VALKEY_PORT || '6379'),
        password: process.env.VALKEY_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        connectTimeout: 10000,
        keepAlive: 30000,
        family: 4,
      }),
      concurrency: 1,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`Portal notification cleanup job ${job.id} completed (deleted ${result.deleted})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Portal notification cleanup job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Portal notification cleanup worker error:', err.message);
  });

  // Schedule the cleanup to run hourly. The fixed jobId keeps the repeatable
  // job idempotent across restarts.
  portalNotificationCleanupQueue
    .add('cleanup', {}, {
      repeat: { pattern: '0 * * * *' },
      jobId: 'portal-notification-cleanup',
    })
    .catch((err) => {
      console.error('Failed to schedule portal notification cleanup job:', err.message);
    });

  console.log('Portal notification cleanup queue worker initialized');

  return worker;
}

async function closePortalNotificationCleanupQueue() {
  console.log('Closing portal notification cleanup queue...');
  if (worker) {
    await worker.close();
  }
  await portalNotificationCleanupQueue.close();
  await connection.quit();
  console.log('Portal notification cleanup queue closed');
}

module.exports = {
  portalNotificationCleanupQueue,
  initializePortalNotificationCleanupWorker,
  closePortalNotificationCleanupQueue,
};
