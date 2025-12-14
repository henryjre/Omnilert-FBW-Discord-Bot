const {
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

const botCommandsChannelId = '1372559141071228998';

module.exports = {
  data: new SlashCommandBuilder().setName('dashboard').setDescription('View the dashboard.'),

  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    if (interaction.channel.id !== botCommandsChannelId) {
      replyEmbed
        .setDescription(
          `🔴 ERROR: This command can only be used in the <#${botCommandsChannelId}> channel.`
        )
        .setColor('Red');

      await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const epiDashboardButton = new ButtonBuilder()
      .setCustomId('viewEpiDashboard')
      .setLabel('EPI')
      .setEmoji('📈')
      .setStyle(ButtonStyle.Success);

    const salaryComputationButton = new ButtonBuilder()
      .setCustomId('salaryComputationDashboard')
      .setLabel('Payslip Details')
      .setEmoji('💵')
      .setStyle(ButtonStyle.Success);

    const dashboardContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# 📊 Employee Dashboard'))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('*Select a button below to view the dashboard.*')
      )
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(epiDashboardButton, salaryComputationButton)
      );

    await interaction.editReply({
      components: [dashboardContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
