const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

const requestType = [
  {
    name: "💸 SALARY/WAGE",
    value: "salaries_wages",
    color: "#ff9d00",
  },
  {
    name: "💵 CASH ADVANCE",
    value: "cash_advance",
    color: "#edff00",
  },
  {
    name: "💳 EXPENSE REIMBURSEMENT",
    value: "expense_reimbursement",
    color: "#00ff9c",
  },
  {
    name: "💰 TRAINING ALLOWANCE",
    value: "training_allowance",
    color: "#00f9ff",
  },
  {
    name: "🚌 TRANSPORT ALLOWANCE",
    value: "transport_allowance",
    color: "#9e00ff",
  },
];

module.exports = {
  data: new SlashCommandBuilder().setName("cash_request"),
  pushToArray: false,
  async execute(interaction, client) {
    const modalId = interaction.options.getString("option");
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
      time: 300000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        return await client.commands
          .get("cash_request_data")
          .execute(interaction, client, type, modalResponse);
      }
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: "❌ An error occurred while processing your request.",
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
    .setLabel(`🔗 Reference Number`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the reference number/digits.")
    .setRequired(true)
    .setMaxLength(100);

  const secondInput = new TextInputBuilder()
    .setCustomId(`requestedAmount`)
    .setLabel(`💲 Requested Amount`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the amount requested.")
    .setRequired(true);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`bankNameInput`)
    .setLabel(`🏛️ Bank Name`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the name of the bank.")
    .setRequired(true);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`accountNameInput`)
    .setLabel(`👤 Account Name`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the name of the bank account.")
    .setRequired(true);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`accountNumberInput`)
    .setLabel(`🔢 Account Number`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the account number of the bank account.")
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);
  const fifthActionRow = new ActionRowBuilder().addComponents(fifthInput);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow,
    fifthActionRow
  );
  return modal;
}
