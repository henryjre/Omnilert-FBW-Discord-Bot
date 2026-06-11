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
      // Goal: delete EVERY bot-authored DM message older than 24h, whether or
      // not it is tracked in portal_notifications (orphaned messages included).
      //
      // Discord has no bulk-delete endpoint for DM channels, so each message
      // must be deleted individually. We make that loop robust: paginate the
      // channel history, respect rate limits, and continue past per-message
      // errors. DB rows are reconciled in bulk afterward.

      // The set of DM channels to sweep = every channel we've ever recorded a
      // portal notification in. The Discord API cannot enumerate a user's DMs,
      // so this is the authoritative source of "channels the bot has DMed".
      const channelRows = db
        .prepare(
          `
          SELECT DISTINCT dm_channel_id
          FROM portal_notifications
          WHERE dm_channel_id IS NOT NULL
        `
        )
        .all();

      if (channelRows.length === 0) {
        return { success: true, deleted: 0, channelsScanned: 0 };
      }

      const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
      const botId = client.user && client.user.id;
      let deleted = 0;
      let channelsScanned = 0;
      const deletedMessageIds = [];

      for (const { dm_channel_id: channelId } of channelRows) {
        let channel;
        try {
          channel = await client.channels.fetch(channelId);
        } catch (error) {
          // Channel unreachable (user closed DMs, blocked the bot, etc.).
          // Drop its tracked rows so we stop retrying it forever.
          console.error(
            `Portal cleanup: cannot fetch DM channel ${channelId}: ${error.message}`
          );
          db.prepare('DELETE FROM portal_notifications WHERE dm_channel_id = ?').run(
            channelId
          );
          continue;
        }

        channelsScanned += 1;

        // Paginate the channel history from newest to oldest, deleting every
        // bot-authored message older than the cutoff.
        let before;
        while (true) {
          let batch;
          try {
            batch = await channel.messages.fetch({ limit: 100, before });
          } catch (error) {
            console.error(
              `Portal cleanup: failed to fetch history for ${channelId}: ${error.message}`
            );
            break;
          }

          if (batch.size === 0) break;

          // Oldest id in this batch becomes the pagination cursor.
          before = batch.lastKey();

          for (const message of batch.values()) {
            if (botId && message.author.id !== botId) continue;
            if (message.createdTimestamp >= cutoffMs) continue;

            try {
              await message.delete();
              deletedMessageIds.push(message.id);
              deleted += 1;
            } catch (error) {
              // 429s are retried transparently by discord.js; anything else
              // (10008 Unknown Message, etc.) we log and skip.
              console.error(
                `Portal cleanup: failed to delete DM message ${message.id}: ${error.message}`
              );
            }
          }

          // Once a full batch is entirely newer than the cutoff we can stop:
          // history is ordered newest-first, so older batches are all expired,
          // but a partial last page (size < 100) means we've reached the end.
          if (batch.size < 100) break;
        }
      }

      // Bulk-reconcile the DB: drop rows for messages we deleted, plus any
      // tracked rows already past the cutoff (orphaned/untracked-in-Discord).
      if (deletedMessageIds.length > 0) {
        const placeholders = deletedMessageIds.map(() => '?').join(',');
        db.prepare(
          `DELETE FROM portal_notifications WHERE message_id IN (${placeholders})`
        ).run(...deletedMessageIds);
      }
      db.prepare(
        `
        DELETE FROM portal_notifications
        WHERE created_at IS NOT NULL
          AND created_at <= datetime('now', '-24 hours')
      `
      ).run();

      console.log(
        `✓ Portal notification cleanup deleted ${deleted} DM message(s) across ${channelsScanned} channel(s)`
      );

      return { success: true, deleted, channelsScanned };
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
