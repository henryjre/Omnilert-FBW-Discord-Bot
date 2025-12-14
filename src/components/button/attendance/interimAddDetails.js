const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: {
    name: `interimAddDetails`,
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId('attendanceInterimModal')
      .setTitle(`INTERIM DUTY FORM DETAILS`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`shiftCoverageInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const firstLabel = new LabelBuilder()
      .setLabel('Shift Coverage')
      .setDescription('Enter the shift coverage.')
      .setTextInputComponent(firstInput);

    const secondInput = new TextInputBuilder()
      .setCustomId(`scopeOfWorkIput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const secondLabel = new LabelBuilder()
      .setLabel('Scope of Work')
      .setDescription('Enter the scope of work.')
      .setTextInputComponent(secondInput);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`assignedByInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const thirdLabel = new LabelBuilder()
      .setLabel('Assigned By')
      .setDescription('Enter who assigned the duty.')
      .setTextInputComponent(thirdInput);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`messageId`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setValue(interaction.message.id)
      .setRequired(true);

    const fourthLabel = new LabelBuilder()
      .setLabel('Message ID')
      .setDescription('DO NOT CHANGE THIS')
      .setTextInputComponent(fourthInput);

    modal.addLabelComponents(firstLabel, secondLabel, thirdLabel, fourthLabel);
    await interaction.showModal(modal);
  },
};
