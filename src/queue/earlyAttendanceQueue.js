const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Create Valkey connection
const connection = new IORedis({
  host: process.env.VALKEY_HOST || '127.0.0.1',
  port: process.env.VALKEY_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('connect', () => {
  console.log('Connected to Valkey for early attendance queue');
});

connection.on('error', (err) => {
  console.error('Valkey connection error:', err.message);
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

        return { success: true, employeeName, attendanceId };
      } catch (error) {
        console.error(`✗ Failed to send scheduled message for ${employeeName}:`, error.message);
        throw error; // BullMQ will retry based on job options
      }
    },
    {
      connection: connection.duplicate(),
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
