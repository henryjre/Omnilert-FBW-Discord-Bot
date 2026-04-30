const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const {
  ONBOARDING_ROLE_ID,
  ONBOARDING_ROLE_REMOVAL_DELAY_MS,
  buildOnboardingRoleRemovalJobOptions,
} = require('../functions/helpers/onboardingUtils');

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
      console.error('Failed to connect to Valkey for onboarding role removal after 5 attempts.');
      return null;
    }
    return Math.min(times * 500, 3000);
  },
});

connection.on('connect', () => {
  console.log('✓ Connected to Valkey for onboarding role removal queue');
});

connection.on('error', (err) => {
  console.error('✗ Valkey connection error (onboarding role removal):', err.message);
});

const onboardingRoleRemovalQueue = new Queue('onboarding-role-removal', {
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

async function scheduleOnboardingRoleRemoval(guildId, userId) {
  return onboardingRoleRemovalQueue.add(
    'remove-onboarding-role',
    { guildId, userId },
    buildOnboardingRoleRemovalJobOptions(guildId, userId)
  );
}

function initializeOnboardingRoleRemovalWorker(client) {
  if (worker) {
    console.log('Onboarding role removal worker already initialized');
    return worker;
  }

  worker = new Worker(
    'onboarding-role-removal',
    async (job) => {
      const { guildId, userId } = job.data;

      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);

      if (member.roles.cache.has(ONBOARDING_ROLE_ID)) {
        await member.roles.remove(ONBOARDING_ROLE_ID);
      }

      return { success: true, guildId, userId };
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
    console.log(`Onboarding role removal job ${job.id} completed for ${result.userId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Onboarding role removal job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Onboarding role removal worker error:', err.message);
  });

  console.log('Onboarding role removal worker initialized');
  return worker;
}

async function closeOnboardingRoleRemovalQueue() {
  console.log('Closing onboarding role removal queue...');
  if (worker) {
    await worker.close();
  }
  await onboardingRoleRemovalQueue.close();
  await connection.quit();
  console.log('Onboarding role removal queue closed');
}

module.exports = {
  ONBOARDING_ROLE_REMOVAL_DELAY_MS,
  closeOnboardingRoleRemovalQueue,
  initializeOnboardingRoleRemovalWorker,
  onboardingRoleRemovalQueue,
  scheduleOnboardingRoleRemoval,
};
