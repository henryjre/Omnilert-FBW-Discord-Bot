const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('cash_deposit_request'),
  pushToArray: false,
  async execute(interaction, client, attachmentFile) {
    const modal = await buildModal(interaction);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const isValid =
          i.customId === `cdrModal_${interaction.id}` && i.user.id === interaction.user.id;

        if (!isValid) return false;

        await i.deferUpdate();
        return true;
      },
      time: 600000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        return await client.commands
          .get('cdr_data')
          .execute(interaction, client, modalResponse, attachmentFile);
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

async function buildModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`cdrModal_${interaction.id}`)
    .setTitle(`CASH DEPOSIT REQUEST`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`dateInput`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const firstLabel = new LabelBuilder()
    .setLabel('📆 Date')
    .setDescription('Enter the date of the request.')
    .setTextInputComponent(firstInput);

  const secondInput = new TextInputBuilder()
    .setCustomId(`branchInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const secondLabel = new LabelBuilder()
    .setLabel('🛒 Branch')
    .setDescription('Enter the store branch.')
    .setTextInputComponent(secondInput);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`employeesInput`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const thirdLabel = new LabelBuilder()
    .setLabel('👤 Employees on Duty')
    .setDescription('Enter the name of the employees on duty.')
    .setTextInputComponent(thirdInput);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`reasonInput`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const fourthLabel = new LabelBuilder()
    .setLabel('❓ Reason')
    .setDescription('Enter the reason for the deposit request.')
    .setTextInputComponent(fourthInput);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`amountInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const fifthLabel = new LabelBuilder()
    .setLabel('💵 Amount')
    .setDescription('Enter the requested deposit amount.')
    .setTextInputComponent(fifthInput);

  modal.addLabelComponents(firstLabel, secondLabel, thirdLabel, fourthLabel, fifthLabel);
  return modal;
}
