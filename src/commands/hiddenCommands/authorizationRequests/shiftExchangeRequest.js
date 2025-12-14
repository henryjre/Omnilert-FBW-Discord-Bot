const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('shift_xchange'),
  pushToArray: false,
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId('shiftExchangeRequestModal')
      .setTitle(`SHIFT EXCHANGE REQUEST`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const firstLabel = new LabelBuilder()
      .setLabel('📆 Date')
      .setDescription('Enter the date.')
      .setTextInputComponent(firstInput);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`shiftInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const thirdLabel = new LabelBuilder()
      .setLabel('⏱️ Shift')
      .setDescription('Enter the shift.')
      .setTextInputComponent(thirdInput);

    modal.addLabelComponents(firstLabel, thirdLabel);
    await interaction.showModal(modal);
  },
};
