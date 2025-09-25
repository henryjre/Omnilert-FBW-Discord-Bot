const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const commandsChannel = "1372559141071228998";

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
                name: "⌛ Interim Duty Form (Test)",
                value: "new_interim",
              },
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
              {
                name: "💳 Payment",
                value: "payment",
              },
              {
                name: "💰 Replenishment",
                value: "replenishment",
              },
            ])
        )
        .addStringOption((option) =>
          option
            .setName("branch")
            .setDescription("Select the branch.")
            .setRequired(true)
            .setChoices([
              {
                name: "DHVSU Bacolor",
                value: "1314492758278279182",
              },
              {
                name: "Primark Center Guagua",
                value: "1314492835487027220",
              },
              {
                name: "Robinsons Starmills CSFP",
                value: "1314492984728879155",
              },
              {
                name: "JASA Hiway Guagua",
                value: "1314493220922593370",
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
              {
                name: "📥 Cash Deposit",
                value: "cash_deposit",
              },
            ])
        )
        .addAttachmentOption((option) =>
          option
            .setName("attachment")
            .setDescription("Add some optional attachment.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("signatories")
        .setDescription("Request a signatories from the management.")
    ),
  async execute(interaction, client) {
    if (interaction.channel.id !== commandsChannel) {
      return await interaction.reply({
        content:
          "This command can only be used in the <#1372559141071228998> channel.",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "authorization":
        const authOptions = interaction.options.getString("option");
        await runAuthorizationsCommand(interaction, client, authOptions);
        break;

      case "cash":
        await runCashRequestsCommand(interaction, client);
        break;

      case "signatories":
        await runSignatoriesCommand(interaction, client);
        break;

      default:
        break;
    }
  },
};

async function runAuthorizationsCommand(interaction, client, option) {
  const authRequests = ["absence", "tardiness", "undertime"];
  const financeRequests = ["payment", "replenishment"];

  if (financeRequests.includes(option)) {
    return await client.commands
      .get("finance_request")
      .execute(interaction, client, option);
  } else if (authRequests.includes(option)) {
    return await client.commands
      .get("auth_request")
      .execute(interaction, client, option);
  } else {
    return await client.commands.get(option)?.execute(interaction, client);
  }
}

async function runCashRequestsCommand(interaction, client) {
  const opt = interaction.options.getString("option");
  const attachment = interaction.options.getAttachment("attachment");

  if (opt === "cash_deposit") {
    return await client.commands
      .get("cash_deposit_request")
      .execute(interaction, client, attachment);
  } else {
    return await client.commands
      .get("cash_request")
      .execute(interaction, client, attachment);
  }
}

async function runSignatoriesCommand(interaction, client) {
  return await client.commands
    .get("signatories_request")
    .execute(interaction, client);
}
