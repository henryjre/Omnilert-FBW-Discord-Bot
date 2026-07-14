const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const {
  MEETING_VOICE_FINISH_DELAY_MS,
  countNonBotMembers,
  postMeetingFinished,
} = require('../functions/helpers/meetingVoiceAttendance');

let connection = null;
let meetingVoiceQueue = null;
let worker = null;

function createConnection() {
  const redisConnection = new IORedis({
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
        console.error('Failed to connect to Valkey for meeting voice queue after 5 attempts.');
        return null;
      }
      return Math.min(times * 500, 3000);
    },
  });

  redisConnection.on('connect', () => {
    console.log('✓ Connected to Valkey for meeting voice queue');
  });

  redisConnection.on('error', (err) => {
    console.error('✗ Valkey connection error (meeting voice):', err.message);
  });

  return redisConnection;
}

function getMeetingVoiceQueue() {
  if (!connection) connection = createConnection();
  if (!meetingVoiceQueue) {
    meetingVoiceQueue = new Queue('meeting-voice', {
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
  }

  return meetingVoiceQueue;
}

async function scheduleMeetingVoiceFinishJob(
  meeting,
  delayMs = MEETING_VOICE_FINISH_DELAY_MS,
) {
  if (!meeting?.meeting_id || !meeting?.voice_channel_id) return null;

  const emptyVersion = Number(meeting.empty_version) || 0;

  return getMeetingVoiceQueue().add(
    'finish',
    {
      meetingId: meeting.meeting_id,
      voiceChannelId: meeting.voice_channel_id,
      emptyVersion,
    },
    {
      delay: delayMs,
      jobId: `meeting-voice-finish-${meeting.meeting_id}-${emptyVersion}`,
    },
  );
}

async function resolveChannel(client, channelId) {
  let channel = client.channels?.cache?.get?.(channelId);

  if (!channel && typeof client.channels?.fetch === 'function') {
    channel = await client.channels.fetch(channelId).catch(() => null);
  }

  return channel || null;
}

async function completeMeetingVoiceFinishJob(
  jobData,
  client,
  {
    repository = require('../sqliteFunctions'),
    api = { postMeetingFinished },
    now = new Date(),
  } = {},
) {
  const meeting = repository.getMeetingVoiceChannelByMeetingId(jobData.meetingId);

  if (!meeting) return { skipped: true, reason: 'missing-meeting' };
  if (meeting.finished_at) return { skipped: true, reason: 'already-finished' };
  if (meeting.voice_channel_id !== jobData.voiceChannelId) {
    return { skipped: true, reason: 'channel-changed' };
  }
  if ((Number(meeting.empty_version) || 0) !== (Number(jobData.emptyVersion) || 0)) {
    return { skipped: true, reason: 'stale-empty-version' };
  }
  if (!meeting.empty_since) return { skipped: true, reason: 'not-empty' };

  const channel = await resolveChannel(client, jobData.voiceChannelId);
  if (!channel) return { skipped: true, reason: 'missing-channel' };
  if (countNonBotMembers(channel) > 0) return { skipped: true, reason: 'members-present' };

  const endedAt = now.toISOString();
  await api.postMeetingFinished(meeting.meeting_id, endedAt);
  repository.markMeetingVoiceChannelFinished(meeting.meeting_id, endedAt);

  return {
    success: true,
    meetingId: meeting.meeting_id,
    endedAt,
  };
}

function initializeMeetingVoiceWorker(client) {
  if (worker) {
    console.log('Meeting voice queue worker already initialized');
    return worker;
  }

  worker = new Worker(
    'meeting-voice',
    async (job) => {
      if (job.name === 'finish') {
        return completeMeetingVoiceFinishJob(job.data, client);
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
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`Meeting voice job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Meeting voice worker error:', err.message);
  });

  console.log('Meeting voice queue worker initialized');
  return worker;
}

async function closeMeetingVoiceQueue() {
  console.log('Closing meeting voice queue...');
  if (worker) await worker.close();
  if (meetingVoiceQueue) await meetingVoiceQueue.close();
  if (connection) await connection.quit();
  console.log('Meeting voice queue closed');
}

module.exports = {
  closeMeetingVoiceQueue,
  completeMeetingVoiceFinishJob,
  getMeetingVoiceQueue,
  initializeMeetingVoiceWorker,
  scheduleMeetingVoiceFinishJob,
};
