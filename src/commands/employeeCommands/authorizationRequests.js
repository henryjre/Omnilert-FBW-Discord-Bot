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
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "authorization":
        const option = interaction.options.getString("option");
        await runCommand(interaction, client, option);
        break;

      default:
        break;
    }
  },
};

async function runCommand(interaction, client, option) {
  const authRequests = ["absence", "tardiness", "undertime"];

  if (!authRequests.includes(option)) {
    return await client.commands.get(option).execute(interaction, client);
  }

  return await client.commands
    .get("auth_request")
    .execute(interaction, client, option);
}
