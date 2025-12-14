const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('auth_request').setDescription('Check-in or check-out'),
  pushToArray: false,
  async execute(interaction, client, formType) {
    // formType: absence / tardiness / undertime

    if (['tardiness', 'undertime'].includes(formType)) {
      return interaction.reply({
        content: 'This command is unavailable.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('authRequestModal')
      .setTitle(`${formType.toUpperCase()} AUTHORIZATION REQUEST`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter the date.')
      .setRequired(true)
      .setMaxLength(100);

    const firstLabel = new LabelBuilder().setLabel('Date').setTextInputComponent(firstInput);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`shiftInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder('Enter the shift.')
      .setRequired(true);

    const thirdLabel = new LabelBuilder().setLabel('Shift').setTextInputComponent(thirdInput);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`reasonInput`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setPlaceholder(`Enter the reason for ${formType}.`)
      .setRequired(true);

    const fourthLabel = new LabelBuilder().setLabel('Reason').setTextInputComponent(fourthInput);

    const fifthInput = new TextInputBuilder()
      .setCustomId(`type`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setValue(formType)
      .setRequired(true);

    const fifthLabel = new LabelBuilder()
      .setLabel('Type')
      .setDescription('DO NOT CHANGE THIS')
      .setTextInputComponent(fifthInput);

    modal.addLabelComponents(firstLabel, thirdLabel, fourthLabel, fifthLabel);
    await interaction.showModal(modal);
  },
};
