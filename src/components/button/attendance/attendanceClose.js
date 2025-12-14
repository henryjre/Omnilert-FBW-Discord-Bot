const {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} = require('discord.js');

const managementRole = '1314413671245676685';

module.exports = {
  data: {
    name: `attendanceClose`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has(managementRole)) {
      return await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('posAuditCompleteConfirmation')
      .setTitle('CONFIRMATION');

    const firstInput = new TextInputBuilder()
      .setCustomId('posAuditCompleteInput')
      .setStyle(TextInputStyle.Short)
      .setValue('confirm')
      .setPlaceholder("Type 'confirm' to confirm audit complete.")
      .setMaxLength(7)
      .setRequired(true);

    const firstLabel = new LabelBuilder()
      .setLabel('Confirm audit completion?')
      .setTextInputComponent(firstInput);

    const secondInput = new TextInputBuilder()
      .setCustomId('posSessionMessageId')
      .setStyle(TextInputStyle.Short)
      .setValue(interaction.message.id)
      .setMaxLength(100)
      .setRequired(true);

    const secondLabel = new LabelBuilder()
      .setLabel('Message ID')
      .setDescription('DO NOT CHANGE THIS')
      .setTextInputComponent(secondInput);

    modal.addLabelComponents(firstLabel, secondLabel);

    await interaction.showModal(modal);
  },
};
