const chalk = require('chalk');
const { initializeWorker } = require('../../queue/earlyAttendanceQueue');
const { initializeAnnouncementAckWorker } = require('../../queue/announcementAckQueue');

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
  },
};
