const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('testt').setDescription('Testing purposes!'),
  async execute(interaction, client) {
    if (interaction.user.id !== '748568303219245117') {
      return await interaction.reply({
        content: '🔴 ERROR: You cannot use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setDescription(
        `
      # Welcome to Omnilert!
      To continue, click the **JOIN** button below and follow the onboarding process.
      `
      )
      .setColor('White');
  },
};
