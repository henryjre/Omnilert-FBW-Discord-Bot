const {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
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
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    const firstLabel = new LabelBuilder()
      .setLabel('Brief Description')
      .setDescription('Explain the description of the violation.')
      .setTextInputComponent(firstInput);

    const secondInput = new TextInputBuilder()
      .setCustomId('messageIdInput')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setValue(interaction.message.id)
      .setRequired(true);

    const secondLabel = new LabelBuilder()
      .setLabel('Message ID')
      .setDescription('DO NOT CHANGE THIS')
      .setTextInputComponent(secondInput);

    modal.addLabelComponents(firstLabel, secondLabel);

    await interaction.showModal(modal);
  },
};
