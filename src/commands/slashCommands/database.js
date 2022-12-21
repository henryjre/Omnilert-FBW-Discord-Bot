const { SlashCommandBuilder } = require("discord.js");
let db;

(async () => {
  db = await require("../src/database/db");
})();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("database")
    .setDescription("Returns information from a database!"),
  async execute(interaction, client) {
    await interaction.reply({
      content: `Server ID: ${guildProfile.guildId}`,
    });
    console.log(guildProfile);
  },
};
