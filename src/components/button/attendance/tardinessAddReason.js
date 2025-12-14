const { ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: {
    name: `tardinessAddReason`,
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
    const tardinessReasonField = messageEmbed.fields.find((field) => field.name === 'Reason');

    let tardinessReasonInput = '';

    if (tardinessReasonField) {
      tardinessReasonInput = tardinessReasonField.value.split('|')[1].trim();
    }

    const modal = new ModalBuilder().setCustomId('attendanceTardinessModal').setTitle(`Add Reason`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`tardinessReasonInput`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setValue(tardinessReasonInput)
      .setRequired(true);

    const firstLabel = new LabelBuilder()
      .setLabel('Reason')
      .setDescription('Enter the reason.')
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
