require('dotenv').config({ path: 'src/.env' });

const {
  closeDiscordActivityQueue,
  replayFailedDiscordActivity,
} = require('../queue/discordActivityQueue');
const { validateActivityConfiguration } = require('../utils/discordActivity');

async function main() {
  const eventId = process.argv[2];
  if (!eventId) {
    throw new Error('Usage: pnpm activity:replay <event-id>');
  }
  if (String(process.env.DISCORD_ACTIVITY_LOG_ENABLED).toLowerCase() !== 'true') {
    throw new Error('Discord activity logging must be enabled before replaying events');
  }

  validateActivityConfiguration();
  const requeued = await replayFailedDiscordActivity(eventId);
  if (!requeued) {
    throw new Error(`Failed Discord activity not found: ${eventId}`);
  }

  console.log(`Requeued Discord activity ${eventId}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDiscordActivityQueue();
  });
