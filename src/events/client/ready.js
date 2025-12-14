const chalk = require('chalk');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    await client.guilds.cache
      .get(process.env.node_env === 'prod' ? process.env.prodGuildId : process.env.testGuildId)
      .members.fetch();
    console.log(chalk.green(`🟢 ${client.user.tag} is online!`));
  },
};
