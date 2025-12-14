const {
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

module.exports = {
  data: {
    name: `backToDashboard`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const slashInteraction = interaction.message.interaction;
    if (slashInteraction) {
      const slashUser = slashInteraction.user;
      if (!slashUser.id.includes(interaction.user.id)) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');
        return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    await interaction.deferUpdate();

    const epiDashboardButton = new ButtonBuilder()
      .setCustomId('viewEpiDashboard')
      .setLabel('View EPI')
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

    await interaction.message.edit({
      components: [dashboardContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
