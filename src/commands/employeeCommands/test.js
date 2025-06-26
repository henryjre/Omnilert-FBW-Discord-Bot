module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Testing purposes!"),
  async execute(interaction, client) {
    interaction.reply("pong!")
  },
};
