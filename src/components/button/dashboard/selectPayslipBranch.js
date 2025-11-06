const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
  data: {
    name: `salaryComputationDashboard`
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

    // const preloadEmbed = new EmbedBuilder()
    //   .setTitle('📊Employee Dashboard')
    //   .setDescription('*Computing current payslip details... Please wait.*')
    //   .setColor('Orange');

    // await interaction.message.edit({ embeds: [preloadEmbed], components: [] });

    await interaction.deferUpdate();

    const selectBranchEmbed = EmbedBuilder.from(messageEmbed).setDescription(
      '*Select a branch to view the payslip details.*'
    );

    if (selectBranchEmbed.data.fields) {
      delete selectBranchEmbed.data.fields;
    }

    if (selectBranchEmbed.data.footer) {
      delete selectBranchEmbed.data.footer;
    }

    const branchMenu = new StringSelectMenuBuilder()
      .setCustomId('payslipBranchMenu')
      .setPlaceholder('Select a branch')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        { label: 'Omnilert', value: 'Main Omnilert' },
        { label: 'DHVSU Bacolor', value: 'DHVSU Bacolor' },
        { label: 'Primark Center Guagua', value: 'Primark Center Guagua' },
        { label: 'Robinsons Starmills CSFP', value: 'Robinsons Starmills CSFP' },
        { label: 'JASA Hiway Guagua', value: 'JASA Hiway Guagua' }
      );

    const backButton = new ButtonBuilder()
      .setCustomId('backToDashboard')
      .setLabel('Back To Dashboard')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary);

    const menuRow = new ActionRowBuilder().addComponents(branchMenu);

    const buttonRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.message.edit({
      embeds: [selectBranchEmbed],
      components: [menuRow, buttonRow]
    });
  }
};
