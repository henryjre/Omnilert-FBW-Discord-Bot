const chalk = require("chalk");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    await client.guilds.cache.get(process.env.prodGuildId).members.fetch();
    console.log(chalk.green(`🟢 ${client.user.tag} is online!`));
  },
};
