const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { incrementThreadApprovals, getThreadApprovals } = require('../sqliteFunctions');
const { isScheduleChannel, updateStarterMessageApprovals } = require('../functions/helpers/approvalCounterUtils');

// Create Valkey connection with simplified configuration
const connection = new IORedis({
  host: process.env.VALKEY_HOST || '127.0.0.1',
  port: parseInt(process.env.VALKEY_PORT || '6379'),
  password: process.env.VALKEY_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true, // Changed to true for better connection validation
  lazyConnect: false,
  connectTimeout: 10000,
  keepAlive: 30000,
  family: 4, // Force IPv4
  retryStrategy(times) {
    if (times > 5) {
      console.error('Failed to connect to Valkey after 5 attempts. Stopping retries.');
      return null;
    }
    const delay = Math.min(times * 500, 3000);
    console.log(`Retrying Valkey connection (attempt ${times}/${5}) in ${delay}ms...`);
    return delay;
  },
});

connection.on('connect', () => {
  console.log('✓ Connected to Valkey for early attendance queue');
});

connection.on('ready', () => {
  console.log('✓ Valkey connection is ready');
});

connection.on('error', (err) => {
  console.error('✗ Valkey connection error:', err.message);
});

connection.on('close', () => {
  console.log('⚠ Valkey connection closed');
});

connection.on('reconnecting', () => {
  console.log('⟳ Reconnecting to Valkey...');
});

// Create queue for early attendance messages
const earlyAttendanceQueue = new Queue('early-attendance', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

// Worker will be initialized separately to access Discord client
let worker = null;

function initializeWorker(client) {
  if (worker) {
    console.log('Early attendance worker already initialized');
    return worker;
  }

  worker = new Worker(
    'early-attendance',
    async (job) => {
      const { threadId, messagePayload, employeeName, attendanceId } = job.data;

      try {
        console.log(`Processing early attendance message for ${employeeName} (ID: ${attendanceId})`);

        // Fetch the thread channel
        const thread = await client.channels.fetch(threadId);

        if (!thread) {
          throw new Error(`Thread ${threadId} not found`);
        }

        // Send the message
        await thread.send(messagePayload);

        console.log(`✓ Early attendance message sent for ${employeeName} (Attendance ID: ${attendanceId})`);

        // Track approval count if in a schedule channel
        if (thread.isThread() && isScheduleChannel(thread.parentId)) {
          try {
            const starterMsg = await thread.fetchStarterMessage();

            // Increment approval count in database
            incrementThreadApprovals(thread.id, thread.parentId, starterMsg.id);

            // Get updated count
            const { current_approvals } = getThreadApprovals(thread.id);

            // Update starter message button
            await updateStarterMessageApprovals(thread, current_approvals);
          } catch (error) {
            console.error('Error tracking approval count (scheduled early attendance):', error.message);
          }
        }

        return { success: true, employeeName, attendanceId };
      } catch (error) {
        console.error(`✗ Failed to send scheduled message for ${employeeName}:`, error.message);
        throw error; // BullMQ will retry based on job options
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
        family: 4, // Force IPv4
      }),
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );

  // Event listeners
  worker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed: ${result.employeeName}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err.message);
  });

  console.log('Early attendance queue worker initialized');

  return worker;
}

// Graceful shutdown
async function closeQueue() {
  console.log('Closing early attendance queue...');
  if (worker) {
    await worker.close();
  }
  await earlyAttendanceQueue.close();
  await connection.quit();
  console.log('Early attendance queue closed');
}

module.exports = {
  earlyAttendanceQueue,
  initializeWorker,
  closeQueue,
};
