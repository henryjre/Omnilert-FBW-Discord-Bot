const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("check")
    .setDescription("Check-in or check-out")
    .addSubcommand((subcommand) =>
      subcommand.setName("in").setDescription("Log-in to the attendance.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("out").setDescription("Log-out of the attendance.")
    ),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const memberId = interaction.user.id;

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "in":
        await checkIn(memberId, interaction);
        break;

      case "out":
        break;

      default:
        break;
    }
  },
};

async function checkIn(discordId, interaction) {
  const webhookUrl = process.env.odoo_checkin_url;
  const payload = { _model: "hr.attendance", x_discord_id: discordId };
  const replyEmbed = new EmbedBuilder();

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log(response.data);

    // Send message based on Odoo's response
    if (response.data.status === "success") {
      replyEmbed
        .setDescription(`### ✅ Check-in successful!`)
        .setColor("Green");
    } else {
      replyEmbed
        .setDescription(`### ⚠️ ${response.data.message}`)
        .setColor("Yellow");
    }
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error);
    replyEmbed
      .setDescription(`### ❌ Error checking in. Please try again later`)
      .setColor("Yellow");
  }

  return await interaction.editReply({ embeds: [replyEmbed] });
}
