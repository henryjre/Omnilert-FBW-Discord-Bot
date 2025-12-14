const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('new_interim'),
  pushToArray: false,
  async execute(interaction, client) {
    const modal = new ModalBuilder().setCustomId('interimDutyModal').setTitle(`INTERIM DUTY FORM`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const firstLabel = new LabelBuilder()
      .setLabel('📆 Interim Duty Date (Follow Format)')
      .setDescription('Example: Oct 1, 2025 | 10-01-25 | October 1, 2025 | 10/1/25')
      .setTextInputComponent(firstInput);

    const secondInput = new TextInputBuilder()
      .setCustomId(`startTime`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const secondLabel = new LabelBuilder()
      .setLabel('🟢 Shift Start Time (Follow Format)')
      .setDescription('Example: 12:00 AM | 8:00 AM | 1:00 PM | 10:00 PM | 5 PM')
      .setTextInputComponent(secondInput);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`endTime`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const thirdLabel = new LabelBuilder()
      .setLabel('🔴 Shift End Time (Follow Format)')
      .setDescription('Example: 12:00 AM | 2:00 AM | 4:00 PM | 10:00 PM | 11 AM')
      .setTextInputComponent(thirdInput);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`shiftCoverageInput`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(true);

    const fourthLabel = new LabelBuilder()
      .setLabel('🎯 Duty Coverage')
      .setDescription('SD | CL | OP')
      .setTextInputComponent(fourthInput);

    const fifthInput = new TextInputBuilder()
      .setCustomId(`reasonInput`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    const fifthLabel = new LabelBuilder()
      .setLabel('❓ Reason')
      .setDescription('Enter the reason for the interim duty.')
      .setTextInputComponent(fifthInput);

    modal.addLabelComponents(firstLabel, secondLabel, thirdLabel, fourthLabel, fifthLabel);
    await interaction.showModal(modal);
  },
};
