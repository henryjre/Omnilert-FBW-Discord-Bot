const chalk = require('chalk');
const { initializeWorker } = require('../../queue/earlyAttendanceQueue');
const { initializeAnnouncementAckWorker } = require('../../queue/announcementAckQueue');
const { initializeOnboardingRoleRemovalWorker } = require('../../queue/onboardingRoleRemovalQueue');
const { initializePortalNotificationCleanupWorker } = require('../../queue/portalNotificationCleanupQueue');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    await client.guilds.cache
      .get(process.env.node_env === 'prod' ? process.env.prodGuildId : process.env.testGuildId)
      .members.fetch();
    console.log(chalk.green(`🟢 ${client.user.tag} is online!`));

    // Initialize early attendance queue worker
    initializeWorker(client);
    console.log(chalk.blue('📋 Early attendance queue worker started'));

    // Initialize announcement acknowledgment queue worker
    initializeAnnouncementAckWorker(client);
    console.log(chalk.blue('📋 Announcement acknowledgment queue worker started'));

    initializeOnboardingRoleRemovalWorker(client);
    console.log(chalk.blue('📋 Onboarding role removal queue worker started'));

    initializePortalNotificationCleanupWorker(client);
    console.log(chalk.blue('📋 Portal notification cleanup queue worker started'));
  },
};
