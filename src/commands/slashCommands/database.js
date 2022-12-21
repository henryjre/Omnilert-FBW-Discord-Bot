const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("database")
    .setDescription("Returns information from a database!"),
  async execute(interaction, client) {

    db.query(
      'INSERT '
    )
    await interaction.reply({
      content: `Server ID: ${guildProfile.guildId}`,
    });
    console.log(guildProfile);
  },
};
