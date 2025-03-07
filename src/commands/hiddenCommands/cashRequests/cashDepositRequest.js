const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

// const requestType = [
//   {
//     name: "💸 SALARY/WAGE",
//     value: "salaries_wages",
//     color: "#ff9d00",
//   },
//   {
//     name: "💵 CASH ADVANCE",
//     value: "cash_advance",
//     color: "#edff00",
//   },
//   {
//     name: "💳 EXPENSE REIMBURSEMENT",
//     value: "expense_reimbursement",
//     color: "#00ff9c",
//   },
//   {
//     name: "💰 TRAINING ALLOWANCE",
//     value: "training_allowance",
//     color: "#00f9ff",
//   },
//   {
//     name: "🚌 TRANSPORT ALLOWANCE",
//     value: "transport_allowance",
//     color: "#9e00ff",
//   },
// ];

module.exports = {
  data: new SlashCommandBuilder().setName("cash_deposit_request"),
  pushToArray: false,
  async execute(interaction, client) {
    const modal = await buildModal();
    await interaction.showModal(modal);
  },
};

async function buildModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`cashDepositRequestModal`)
    .setTitle(`CASH DEPOSIT REQUEST`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`dateInput`)
    .setLabel(`📆 Date`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the date of the request.")
    .setRequired(true)
    .setMaxLength(100);

  const secondInput = new TextInputBuilder()
    .setCustomId(`branchInput`)
    .setLabel(`🛒 Branch`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the store branch.")
    .setRequired(true);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`employeesInput`)
    .setLabel(`👤 Employees on Duty`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder("Enter the name of the employees on duty.")
    .setRequired(true);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`reasonInput`)
    .setLabel(`❓ Reason`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder("Enter the reason for the deposit request.")
    .setRequired(true);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`amountInput`)
    .setLabel(`💵 Amount`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the requested deposit amount.")
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(fifthInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(thirdInput);
  const fifthActionRow = new ActionRowBuilder().addComponents(fourthInput);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow,
    fifthActionRow
  );
  return modal;
}
