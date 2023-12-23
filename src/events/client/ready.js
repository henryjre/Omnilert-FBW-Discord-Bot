const chalk = require("chalk");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    await client.guilds.cache.get("1049165537193754664").members.fetch();
    console.log(chalk.green(`🟢 ${client.user.tag} is online!`));
  },
};
