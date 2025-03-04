const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("request")
    .setDescription("Request something...")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("authorization")
        .setDescription("Request an authorization from the management.")
        .addStringOption((option) =>
          option
            .setName("option")
            .setDescription("Select the request option.")
            .setRequired(true)
            .setChoices([
              {
                name: "⌛ Interim Duty Form",
                value: "interim",
              },
              {
                name: "🔄 Shift Exchange Request",
                value: "shift_xchange",
              },
              {
                name: "🕙 Overtime Claim",
                value: "overtime",
              },
              {
                name: "🤧 Absence Authorization Request",
                value: "absence",
              },
              {
                name: "⏰ Tardiness Authorization Request",
                value: "tardiness",
              },
              {
                name: "🕧 Undertime Authorization Request",
                value: "undertime",
              },
            ])
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cash")
        .setDescription("Request cash from Finance Department.")
        .addStringOption((option) =>
          option
            .setName("option")
            .setDescription("Select the request option.")
            .setRequired(true)
            .setChoices([
              {
                name: "💸 Salaries and Wages",
                value: "salaries_wages",
              },
              {
                name: "💵 Cash Advance",
                value: "cash_advance",
              },
              {
                name: "💳 Expense Reimbursement",
                value: "expense_reimbursement",
              },
              {
                name: "💰 Training Allowance",
                value: "training_allowance",
              },
              {
                name: "🚌 Transport Allowance",
                value: "transport_allowance",
              },
            ])
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "authorization":
        const authOptions = interaction.options.getString("option");
        await runAuthorizationsCommand(interaction, client, authOptions);
        break;

      case "cash":
        const cashOptions = interaction.options.getString("option");
        await runCashRequestsCommand(interaction, client, cashOptions);
        break;

      default:
        break;
    }
  },
};

async function runAuthorizationsCommand(interaction, client, option) {
  const authRequests = ["absence", "tardiness", "undertime"];

  if (!authRequests.includes(option)) {
    return await client.commands.get(option).execute(interaction, client);
  }

  return await client.commands
    .get("auth_request")
    .execute(interaction, client, option);
}

async function runCashRequestsCommand(interaction, client, option) {
  return await client.commands.get("cash_request").execute(interaction, client);
}
