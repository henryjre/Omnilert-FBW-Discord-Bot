const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const { getDepartmentVoiceSessionById } = require('../sqliteFunctions');
const {
  DEPARTMENT_VOICE_REMINDER_MINUTES,
  DEPARTMENT_VOICE_TIMEOUT_MINUTES,
  OFFICE_VOICE_CHANNEL_ID,
  buildDepartmentVoiceReminderPayload,
} = require('../utils/departmentVoiceUtils');

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
      console.error('Failed to connect to Valkey for department voice queue after 5 attempts.');
      return null;
    }
    return Math.min(times * 500, 3000);
  },
});

connection.on('connect', () => {
  console.log('✓ Connected to Valkey for department voice queue');
});

connection.on('error', (err) => {
  console.error('✗ Valkey connection error (department voice):', err.message);
});

const departmentVoiceQueue = new Queue('department-voice', {
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

async function scheduleDepartmentVoiceSessionJobs(session) {
  if (!session?.id) return [];

  const jobs = [];
  for (const minute of DEPARTMENT_VOICE_REMINDER_MINUTES) {
    jobs.push(
      departmentVoiceQueue.add(
        'reminder',
        {
          sessionId: session.id,
          userId: session.user_id,
          threadId: session.thread_id,
          timerVersion: session.timer_version,
          minute,
          minutesLeft: DEPARTMENT_VOICE_TIMEOUT_MINUTES - minute,
        },
        {
          delay: minute * 60 * 1000,
          jobId: `department-voice-${session.id}-${session.timer_version}-reminder-${minute}`,
        }
      )
    );
  }

  jobs.push(
    departmentVoiceQueue.add(
      'auto-checkout',
      {
        sessionId: session.id,
        userId: session.user_id,
        guildId: session.guild_id,
        voiceChannelId: session.voice_channel_id || OFFICE_VOICE_CHANNEL_ID,
        timerVersion: session.timer_version,
      },
      {
        delay: DEPARTMENT_VOICE_TIMEOUT_MINUTES * 60 * 1000,
        jobId: `department-voice-${session.id}-${session.timer_version}-auto-checkout`,
      }
    )
  );

  return Promise.all(jobs);
}

function isStaleDepartmentVoiceJob(jobData) {
  const session = getDepartmentVoiceSessionById(jobData.sessionId);
  if (!session || !session.active) return { stale: true, session };
  if (session.timer_version !== jobData.timerVersion) return { stale: true, session };
  return { stale: false, session };
}

function initializeDepartmentVoiceWorker(client) {
  if (worker) {
    console.log('Department voice queue worker already initialized');
    return worker;
  }

  worker = new Worker(
    'department-voice',
    async (job) => {
      const { stale } = isStaleDepartmentVoiceJob(job.data);
      if (stale) {
        return { skipped: true, reason: 'stale' };
      }

      if (job.name === 'reminder') {
        const thread = await client.channels.fetch(job.data.threadId);
        await thread.send(buildDepartmentVoiceReminderPayload(job.data.userId, job.data.minutesLeft));
        return { success: true, type: 'reminder', sessionId: job.data.sessionId };
      }

      if (job.name === 'auto-checkout') {
        const guild = await client.guilds.fetch(job.data.guildId);
        const member = await guild.members.fetch(job.data.userId);

        if (member.voice?.channelId === job.data.voiceChannelId) {
          await member.voice.disconnect('No department thread update after 30 minutes');
          return { success: true, type: 'auto-checkout', disconnected: true };
        }

        return { success: true, type: 'auto-checkout', disconnected: false };
      }

      return { skipped: true, reason: `unknown job ${job.name}` };
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

  worker.on('failed', (job, err) => {
    console.error(`Department voice job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Department voice worker error:', err.message);
  });

  console.log('Department voice queue worker initialized');
  return worker;
}

async function closeDepartmentVoiceQueue() {
  console.log('Closing department voice queue...');
  if (worker) await worker.close();
  await departmentVoiceQueue.close();
  await connection.quit();
  console.log('Department voice queue closed');
}

module.exports = {
  closeDepartmentVoiceQueue,
  departmentVoiceQueue,
  initializeDepartmentVoiceWorker,
  isStaleDepartmentVoiceJob,
  scheduleDepartmentVoiceSessionJobs,
};
