const {
  LabelBuilder,
  ModalBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = {
  data: {
    name: 'verifyRegistrationButton',
  },
  async execute(interaction, client) {
    const textDisplay = new TextDisplayBuilder().setContent(
      '## Verify website registration\nEnter the email address you used for your Omnilert website registration.'
    );

    const emailInput = new TextInputBuilder()
      .setCustomId('emailInput')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('person@example.com');

    const emailInputLabel = new LabelBuilder()
      .setLabel('Email address')
      .setDescription('Use the same email address from your Omnilert website registration.')
      .setTextInputComponent(emailInput);

    const modal = new ModalBuilder()
      .setCustomId('verifyRegistrationModal')
      .setTitle('VERIFY REGISTRATION')
      .addTextDisplayComponents(textDisplay)
      .addLabelComponents(emailInputLabel);

    await interaction.showModal(modal);
  },
};
