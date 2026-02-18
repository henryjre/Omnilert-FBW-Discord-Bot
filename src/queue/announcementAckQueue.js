const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { EmbedBuilder } = require('discord.js');
const { getNonAcknowledgers, deleteAnnouncementTracking } = require('../sqliteFunctions');

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
      console.error('Failed to connect to Valkey for announcement ack queue after 5 attempts.');
      return null;
    }
    const delay = Math.min(times * 500, 3000);
    console.log(`Retrying Valkey connection for announcement ack queue (attempt ${times}/5) in ${delay}ms...`);
    return delay;
  },
});

connection.on('connect', () => {
  console.log('✓ Connected to Valkey for announcement acknowledgment queue');
});

connection.on('error', (err) => {
  console.error('✗ Valkey connection error (announcement ack):', err.message);
});

// Create queue for announcement acknowledgment checks
const announcementAckQueue = new Queue('announcement-acknowledgment', {
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

function initializeAnnouncementAckWorker(client) {
  if (worker) {
    console.log('Announcement acknowledgment worker already initialized');
    return worker;
  }

  worker = new Worker(
    'announcement-acknowledgment',
    async (job) => {
      const { announcementId, channelId, threadId } = job.data;

      try {
        console.log(`Processing announcement acknowledgment check for ${announcementId}`);

        // Get non-acknowledgers from database
        const nonAcknowledgers = getNonAcknowledgers(announcementId);

        if (nonAcknowledgers.length === 0) {
          console.log(`✓ All users acknowledged announcement ${announcementId}`);
          deleteAnnouncementTracking(announcementId);
          return { success: true, announcementId, allAcknowledged: true };
        }

        // Fetch the acknowledgements thread
        const thread = await client.channels.fetch(threadId);

        if (!thread) {
          throw new Error(`Thread ${threadId} not found`);
        }

        // Create summary embed for non-acknowledgers
        const mentionList = nonAcknowledgers.map(userId => `<@${userId}>`).join('\n');

        const summaryEmbed = new EmbedBuilder()
          .setTitle('⚠️ Pending Acknowledgments')
          .setDescription(`The following users have not acknowledged this announcement:\n\n${mentionList}`)
          .addFields({ name: 'Total', value: `${nonAcknowledgers.length} user(s)`, inline: true })
          .setColor(0xFFA500) // Orange/Warning color
          .setTimestamp();

        await thread.send({ embeds: [summaryEmbed] });

        console.log(`✓ Sent non-acknowledger summary for announcement ${announcementId} (${nonAcknowledgers.length} users)`);

        // Remove acknowledge button from the original announcement message
        try {
          const announcementChannel = await client.channels.fetch(channelId);
          const announcementMessage = await announcementChannel.messages.fetch(announcementId);
          if (announcementMessage.components.length > 0) {
            await announcementMessage.edit({ components: [] });
            console.log(`✓ Removed acknowledge button from announcement ${announcementId}`);
          }
        } catch (error) {
          console.error("Error removing acknowledge button:", error.message);
        }

        // Clean up database record
        deleteAnnouncementTracking(announcementId);

        return { success: true, announcementId, nonAcknowledgerCount: nonAcknowledgers.length };
      } catch (error) {
        console.error(`✗ Failed to process announcement acknowledgment check for ${announcementId}:`, error.message);
        throw error;
      }
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
      concurrency: 5,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`Announcement ack job ${job.id} completed for ${result.announcementId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Announcement ack job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Announcement ack worker error:', err.message);
  });

  console.log('Announcement acknowledgment queue worker initialized');

  return worker;
}

async function closeAnnouncementAckQueue() {
  console.log('Closing announcement acknowledgment queue...');
  if (worker) {
    await worker.close();
  }
  await announcementAckQueue.close();
  await connection.quit();
  console.log('Announcement acknowledgment queue closed');
}

module.exports = {
  announcementAckQueue,
  initializeAnnouncementAckWorker,
  closeAnnouncementAckQueue,
};
