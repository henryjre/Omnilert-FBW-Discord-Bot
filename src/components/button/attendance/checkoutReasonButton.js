const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: {
    name: `checkoutAddReason`,
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

    const messageEmbed = interaction.message.embeds[0];
    const checkoutReasonField = messageEmbed.fields.find(
      (field) => field.name === 'Reason for Checkout'
    );

    let checkoutReasonInput = '';

    if (checkoutReasonField) {
      if (checkoutReasonField.value.includes('|')) {
        checkoutReasonInput = checkoutReasonField.value.split('|')[1].trim();
      } else {
        checkoutReasonInput = checkoutReasonField.value;
      }
    }

    const modal = new ModalBuilder()
      .setCustomId('checkoutReasonModal')
      .setTitle(`Add CheckoutReason`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`checkoutReasonInput`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setValue(checkoutReasonInput)
      .setRequired(true);

    const firstLabel = new LabelBuilder()
      .setLabel('Reason for Checkout')
      .setDescription('Add the reason for checkout.')
      .setTextInputComponent(firstInput);

    const secondInput = new TextInputBuilder()
      .setCustomId(`messageId`)
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
