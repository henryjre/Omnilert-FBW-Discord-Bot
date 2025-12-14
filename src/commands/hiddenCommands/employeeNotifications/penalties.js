const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('penalty'),
  pushToArray: false,
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId('penaltyNotificationModal')
      .setTitle(`PENALTY NOTIFICATION`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const firstLabel = new LabelBuilder()
      .setLabel('📆 Date')
      .setDescription('Enter the date.')
      .setTextInputComponent(firstInput);

    const secondInput = new TextInputBuilder()
      .setCustomId(`branchInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const secondLabel = new LabelBuilder()
      .setLabel('🛒 Branch')
      .setDescription('Enter the branch.')
      .setTextInputComponent(secondInput);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`shiftInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const thirdLabel = new LabelBuilder()
      .setLabel('⏱️ Shift')
      .setDescription('Enter the shift.')
      .setTextInputComponent(thirdInput);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`purposeInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const fourthLabel = new LabelBuilder()
      .setLabel('📝 Purpose')
      .setDescription('Enter the purpose of deduction.')
      .setTextInputComponent(fourthInput);

    const fifthInput = new TextInputBuilder()
      .setCustomId(`amountInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const fifthLabel = new LabelBuilder()
      .setLabel('💲 Deduction Amount')
      .setDescription('Enter the amount of deduction.')
      .setTextInputComponent(fifthInput);

    modal.addLabelComponents(firstLabel, secondLabel, thirdLabel, fourthLabel, fifthLabel);
    await interaction.showModal(modal);
  },
};
