const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config({ path: "src/.env" });

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Add daily giveaway winners.")
    .addStringOption((option) =>
      option
        .setName("order-id")
        .setDescription("The tiktok order ID of the winner.")
        .setRequired(true)
        .setMinLength(18)
        .setMaxLength(18)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of the giveaway.")
        .setRequired(true)
        .addChoices(
          { name: "₱500", value: 500 },
          { name: "₱1000", value: 1000 }
        )
    ),
  async execute(interaction, client) {
    const orderId = interaction.options.getString("order-id");
    const amount = interaction.options.getNumber("amount");

    await interaction.deferReply();

    const orderRegex = /^[0-9]{18}$/;
    if (!orderId.match(orderRegex)) {
      return await interaction.editReply({
        content: "🔴 ERROR: Invalid Order ID format.",
      });
    }

    const url = `https://www.leviosa.ph/_functions/addDailyGiveaway`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: amount,
      }),
    };

    const response = await fetch(url, options).then((res) => res.json());

    if (response.code === 3) {
      return await interaction.editReply({
        content:
          "🔴 FETCH ERROR: There was an error while fetching your request. Please try again.",
      });
    }

    if (response.ok) {
      const embed = new EmbedBuilder()
        .setTitle(`✅ ADDED DAILY GIVEAWAY WINNER`)
        .setColor("#ceff00")
        .addFields([
          {
            name: `TIKTOK ORDER ID`,
            value: `🆔 | ${orderId}`,
          },
          {
            name: `AMOUNT (₱)`,
            value: `🎁 | ${pesoFormatter.format(amount)}`,
          },
        ])
        .setFooter({
          text: `ADDED BY: ${interaction.user.globalName}`,
        })
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [embed],
      });
    }
  },
};
