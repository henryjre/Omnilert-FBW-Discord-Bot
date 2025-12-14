const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');

const requestType = [
  {
    name: '💸 SALARY/WAGE',
    value: 'salaries_wages',
    color: '#ff9d00',
  },
  {
    name: '💵 CASH ADVANCE',
    value: 'cash_advance',
    color: '#edff00',
  },
  {
    name: '💳 EXPENSE REIMBURSEMENT',
    value: 'expense_reimbursement',
    color: '#00ff9c',
  },
  {
    name: '💰 TRAINING ALLOWANCE',
    value: 'training_allowance',
    color: '#00f9ff',
  },
  {
    name: '🚌 TRANSPORT ALLOWANCE',
    value: 'transport_allowance',
    color: '#9e00ff',
  },
];

module.exports = {
  data: new SlashCommandBuilder().setName('cash_request'),
  pushToArray: false,
  async execute(interaction, client, attachmentFile) {
    const modalId = interaction.options.getString('option');
    const type = requestType.find((t) => t.value === modalId);

    const modal = await buildModal(interaction, type);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const isValid =
          i.customId === `modal_${type.value}_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (!isValid) return false;

        await i.deferUpdate();
        return true;
      },
      time: 600000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        return await client.commands
          .get('cash_request_data')
          .execute(interaction, client, type, modalResponse, attachmentFile);
      }
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: '❌ An error occurred while processing your request.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

async function buildModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${type.value}_${interaction.id}`)
    .setTitle(`${type.name} REQUEST`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`referenceNumber`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const firstLabel = new LabelBuilder()
    .setLabel('🔗 Reference Number')
    .setDescription('Enter the reference number/digits.')
    .setTextInputComponent(firstInput);

  const secondInput = new TextInputBuilder()
    .setCustomId(`requestedAmount`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const secondLabel = new LabelBuilder()
    .setLabel('💲 Requested Amount')
    .setDescription('Enter the amount requested.')
    .setTextInputComponent(secondInput);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`bankNameInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const thirdLabel = new LabelBuilder()
    .setLabel('🏛️ Bank Name')
    .setDescription('Enter the name of the bank.')
    .setTextInputComponent(thirdInput);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`accountNameInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const fourthLabel = new LabelBuilder()
    .setLabel('👤 Account Name')
    .setDescription('Enter the name of the bank account.')
    .setTextInputComponent(fourthInput);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`accountNumberInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const fifthLabel = new LabelBuilder()
    .setLabel('🔢 Account Number')
    .setDescription('Enter the account number of the bank account.')
    .setTextInputComponent(fifthInput);

  modal.addLabelComponents(firstLabel, secondLabel, thirdLabel, fourthLabel, fifthLabel);
  return modal;
}
