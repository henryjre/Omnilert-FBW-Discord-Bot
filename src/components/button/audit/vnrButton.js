const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = {
  data: {
    name: `auditVnr`,
  },
  async execute(interaction, client) {
    const permissionRole = '1314413671245676685';

    if (!interaction.member.roles.cache.has(permissionRole)) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = new ModalBuilder().setCustomId('vnrModal').setTitle('Violation Notice Request');

    const firstInput = new TextInputBuilder()
      .setCustomId('vnrDescriptionInput')
      .setLabel(`Brief Description`)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Explain the description of the violation.')
      .setMaxLength(1000)
      .setRequired(true);

    const secondInput = new TextInputBuilder()
      .setCustomId('messageIdInput')
      .setLabel(`Message ID (DO NOT CHANGE)`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setValue(interaction.message.id)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
  },
};
