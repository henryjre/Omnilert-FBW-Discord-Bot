const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: {
    name: `backToDashboard`
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const slashInteraction = interaction.message.interaction;
    if (slashInteraction) {
      const slashUser = slashInteraction.user;
      if (!slashUser.id.includes(interaction.user.id)) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');
        return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    await interaction.deferUpdate();

    const dashboardEmbed = EmbedBuilder.from(messageEmbed)
      .setDescription('*Select a button below to view the dashboard.*')
      .setFields([{ name: 'Employee', value: interaction.member.toString() }]);

    if (dashboardEmbed.data.fields) {
      delete dashboardEmbed.data.fields;
    }

    if (dashboardEmbed.data.footer) {
      delete dashboardEmbed.data.footer;
    }

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

    const buttonRow = new ActionRowBuilder().addComponents(
      epiDashboardButton,
      salaryComputationButton
    );

    await interaction.message.edit({ embeds: [dashboardEmbed], components: [buttonRow] });
  }
};
