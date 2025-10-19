const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const managementRole = '1314413671245676685';

module.exports = {
  data: {
    name: `posAuditComplete`
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has(managementRole)) {
      return await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('posAuditCompleteConfirmation')
      .setTitle('CONFIRMATION');

    const firstInput = new TextInputBuilder()
      .setCustomId('posAuditCompleteInput')
      .setLabel(`Confirm audit completion?`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Type 'confirm' to confirm audit complete.")
      .setValue('confirm')
      .setMaxLength(7)
      .setRequired(true);

    const secondInput = new TextInputBuilder()
      .setCustomId('posSessionMessageId')
      .setLabel(`Message ID (DO NOT CHANGE)`)
      .setStyle(TextInputStyle.Short)
      .setValue(interaction.message.id)
      .setMaxLength(100)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
  }
};
