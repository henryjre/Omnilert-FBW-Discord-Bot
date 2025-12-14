const {
  ContainerBuilder,
  SlashCommandBuilder,
  MessageFlags,
  ButtonStyle,
  ButtonBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('test').setDescription('Testing purposes!'),
  async execute(interaction, client) {
    if (interaction.user.id !== '748568303219245117') {
      return await interaction.reply({
        content: '🔴 ERROR: You cannot use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const welcomeContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Welcome to Omnilert!\nSelect the button below that best describes you. It will trigger the onboarding process.`
        )
      )
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('newToDiscordButton')
            .setLabel(`I'm new to Discord!`)
            .setEmoji({ name: '🐣' })
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('discordProButton')
            .setLabel(`I use Discord like a pro!`)
            .setEmoji({ name: '🐔' })
            .setStyle(ButtonStyle.Secondary)
        )
      );

    await interaction.channel.send({
      components: [welcomeContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
