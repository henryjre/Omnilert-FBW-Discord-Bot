const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} = require("discord.js");
const moment = require("moment");
const pool = require("../../sqlConnectionPool");

const commissionRates = require("./commission.json");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  cooldown: 90,
  data: new SlashCommandBuilder()
    .setName("live")
    .setDescription(
      "See individual livestream stats. Also command for claiming."
    )
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The ID of the livestream. (See /stats command for ID)")
        .setRequired(true)
        .setMinLength(13)
        .setMaxLength(13)
    ),
  async execute(interaction, client) {
    const validRoles = ["1117440696891220050"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1117440696891220050>.`,
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply();

    const streamId = interaction.options.getString("id");

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const findLiveQuery =
      "SELECT * FROM Tiktok_Livestream_Schedules WHERE STREAM_ID = ?";
    const live = await connection
      .query(findLiveQuery, [streamId])
      .catch((err) => console.log(err));

    if (live[0].length <= 0) {
      const noOrdersEmbed = new EmbedBuilder()
        .setTitle(`LIVESTREAM NOT FOUND`)
        .setColor("Red")
        .setDescription("🔴 No livestream found with that livestream ID.");

      await interaction.editReply({
        embeds: [noOrdersEmbed],
      });
      connection.release();
      return;
    }

    if (live[0][0].STREAMER_ID !== interaction.user.id) {
      await interaction.editReply({
        content: "🔴 ERROR: You cannot retrieve that livestream.",
      });
      connection.release();
      return;
    }

    // const findLiveOrdersQuery =
    //   "SELECT " +
    //   "o.STREAM_ID, " +
    //   "GROUP_CONCAT(o.ORDER_STATUS) AS ORDER_STATUSES, " +
    //   "SUM(CASE WHEN o.ORDER_STATUS = 'CANCELLED' THEN 0 ELSE o.ORDER_SUBTOTAL END) AS NET_ORDER_SUBTOTAL, " +
    //   "s.START_TIME, " +
    //   "s.END_TIME " +
    //   "FROM Tiktok_Livestream_Orders o " +
    //   "JOIN Tiktok_Livestream_Schedules s ON o.STREAM_ID = s.STREAM_ID " +
    //   "WHERE o.STREAM_ID = ?";

    const findLiveOrdersQuery =
      "SELECT s.STREAM_ID, s.START_TIME, s.END_TIME, GROUP_CONCAT(o.ORDER_STATUS) AS ORDER_STATUSES, " +
      "SUM(CASE WHEN o.ORDER_STATUS = 'CANCELLED' THEN 0 ELSE o.ORDER_SUBTOTAL END) AS NET_ORDER_SUBTOTAL " +
      "FROM Tiktok_Livestream_Schedules s " +
      "LEFT JOIN Tiktok_Livestream_Orders o ON s.STREAM_ID = o.STREAM_ID " +
      "WHERE s.STREAM_ID = ? ";

    const orders = await connection
      .query(findLiveOrdersQuery, [streamId])
      .catch((err) => console.log(err));

    connection.release();

    orders[0].forEach((order) => {
      order.ORDER_STATUSES = order.ORDER_STATUSES
        ? order.ORDER_STATUSES.split(",")
        : [];
      order.NET_ORDER_SUBTOTAL = order.NET_ORDER_SUBTOTAL
        ? Number(order.NET_ORDER_SUBTOTAL)
        : 0;

      const commission = calculateCommission(Number(order.NET_ORDER_SUBTOTAL));
      order.NET_COMMISSION = commission;
    });

    const liveStats = orders[0][0];

    const pending = liveStats.ORDER_STATUSES.filter(
      (obj) => obj !== "CANCELLED" && obj !== "COMPLETED"
    ).length;
    const cancelled = liveStats.ORDER_STATUSES.filter(
      (obj) => obj === "CANCELLED"
    ).length;
    const completed = liveStats.ORDER_STATUSES.filter(
      (obj) => obj === "COMPLETED"
    ).length;

    const embed = new EmbedBuilder()
      .setTitle(`LIVESTREAM DETAILS`)
      .setAuthor({
        iconURL: interaction.user.displayAvatarURL(),
        name: "Livestreamer: " + interaction.user.globalName,
      })
      .setColor("#84bff3")
      .addFields([
        {
          name: `LIVESTREAM ID`,
          value: `${liveStats.STREAM_ID}`,
        },
        {
          name: `START TIME`,
          value: `⏱️ | ${moment
            .unix(liveStats.START_TIME)
            .format("MMM D, YYYY, h:mm A")}`,
        },
        {
          name: `END TIME`,
          value: `⏱️ | ${moment
            .unix(liveStats.END_TIME)
            .format("MMM D, YYYY, h:mm A")}\n\u200b`,
        },
        {
          name: `PENDING ORDERS`,
          value: `🟠 | ${[pending]} ${pending === 1 ? "order" : "orders"}`,
        },
        {
          name: `CANCELLED ORDERS`,
          value: `🔴 | ${[cancelled]} ${cancelled === 1 ? "order" : "orders"}`,
        },
        {
          name: `COMPLETED ORDERS`,
          value: `🟢 | ${[completed]} ${
            completed === 1 ? "order" : "orders"
          }\n\u200b`,
        },
        {
          name: `NET ORDER SUBTOTAL`,
          value: `📦 | ${pesoFormatter.format(liveStats.NET_ORDER_SUBTOTAL)}`,
        },
        {
          name: `NET COMMISSION`,
          value: `💰 | **${pesoFormatter.format(liveStats.NET_COMMISSION)}**`,
        },
      ])
      .setTimestamp(Date.now());

    const claimButton = new ButtonBuilder()
      .setCustomId("claimLive")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    if (live[0][0].CLAIMED === 1) {
      claimButton
        .setLabel("Claimed")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
    } else {
      if (pending > 0) {
        claimButton
          .setLabel("Cannot claim yet")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);
      } else {
        claimButton.setStyle(ButtonStyle.Success).setDisabled(false);
      }
    }

    const button = new ActionRowBuilder().addComponents(claimButton);

    const currentPage = await interaction.editReply({
      content:
        pending > 0
          ? "You cannot yet claim the commission for this livestream because it currently has pending orders."
          : "",
      embeds: [embed],
      components: [button],
      fetchReply: true,
    });

    const collector = await currentPage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("end", async (i) => {
      const message = await currentPage.channel.messages.fetch(currentPage.id);

      const currentEmbed = message.embeds[0].data;
      if (currentEmbed.title === "LIVESTREAM DETAILS") {
        await currentPage.edit({
          embeds: [embed],
          components: [],
        });
      }
    });

    function calculateCommission(netSales) {
      for (const commissionRange of commissionRates) {
        const { min, max, commission } = commissionRange;

        if (
          (min <= netSales && netSales <= max) ||
          (min <= netSales && max === null)
        ) {
          if (commission === "Manual Computation") {
            return netSales * 0.1;
          } else {
            return commission;
          }
        }
      }

      if (netSales >= 20000) {
        return netSales * 0.1;
      }

      return "No commission applicable for the given netSales";
    }
  },
};
