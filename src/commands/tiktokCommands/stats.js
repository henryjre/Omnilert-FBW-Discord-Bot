const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} = require("discord.js");
const moment = require("moment-timezone");

const { managementPool } = require("../../sqlConnection");
const commissionRates = require("./commission.json");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Check your livestream statistics."),
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

    // const streamerName = interaction.user.globalName;

    const connection = await managementPool
      .getConnection()
      .catch((err) => console.log(err));

    // const findLiveOrdersQuery =
    //   "SELECT " +
    //   "o.STREAM_ID, " +
    //   "GROUP_CONCAT(o.ORDER_STATUS) AS ORDER_STATUSES, " +
    //   "SUM(CASE WHEN o.ORDER_STATUS = 'CANCELLED' THEN 0 ELSE o.ORDER_SUBTOTAL END) AS NET_ORDER_SUBTOTAL, " +
    //   "s.CLAIMED, " +
    //   "s.START_TIME, " +
    //   "s.END_TIME " +
    //   "FROM Tiktok_Livestream_Orders o " +
    //   "JOIN Tiktok_Livestream_Schedules s ON o.STREAM_ID = s.STREAM_ID " +
    //   "WHERE s.STREAMER_ID = ? " +
    //   "GROUP BY o.STREAM_ID " +
    //   "ORDER BY s.END_TIME DESC";

    // const findLiveOrders = await connection
    //   .query(findLiveOrdersQuery, [interaction.user.id])
    //   .catch((err) => console.error(err));

    const findOrdersForScheduleQuery =
      "SELECT s.STREAM_ID, s.CLAIMED, s.START_TIME, s.END_TIME, GROUP_CONCAT(o.ORDER_STATUS) AS ORDER_STATUSES, " +
      "SUM(CASE WHEN o.ORDER_STATUS = 'CANCELLED' THEN 0 ELSE o.ORDER_SUBTOTAL END) AS NET_ORDER_SUBTOTAL " +
      "FROM Tiktok_Livestream_Schedules s " +
      "LEFT JOIN Tiktok_Livestream_Orders o ON s.STREAM_ID = o.STREAM_ID " +
      "WHERE s.STREAMER_ID = ? " +
      "GROUP BY s.STREAM_ID";

    const findLiveOrders = await connection
      .query(findOrdersForScheduleQuery, [interaction.user.id])
      .catch((err) => console.error(err));

    connection.release();

    if (findLiveOrders[0].length <= 0) {
      const noOrdersEmbed = new EmbedBuilder()
        .setTitle(`NO LIVESTREAMS FOUND`)
        .setColor("Red")
        .setDescription("🔴 You have no livestreams recorded yet.");

      await interaction.editReply({
        embeds: [noOrdersEmbed],
      });
      return;
    }

    findLiveOrders[0].forEach((order) => {
      order.ORDER_STATUSES = order.ORDER_STATUSES
        ? order.ORDER_STATUSES.split(",")
        : [];
      order.NET_ORDER_SUBTOTAL = order.NET_ORDER_SUBTOTAL
        ? Number(order.NET_ORDER_SUBTOTAL)
        : 0;
      const commission = calculateCommission(Number(order.NET_ORDER_SUBTOTAL));
      order.NET_COMMISSION = commission;

      if (Number(order.NET_ORDER_SUBTOTAL) === 0) {
        order.CLAIMABLE = "🟢 Ready to claim";
        return;
      }

      if (order.CLAIMED === 1) {
        order.CLAIMABLE = "🔴 Already Claimed";
      } else if (
        order.ORDER_STATUSES.filter(
          (obj) => obj !== "CANCELLED" && obj !== "COMPLETED"
        ).length <= 0 &&
        order.CLAIMED !== 1
      ) {
        order.CLAIMABLE = "🟢 Ready to claim";
      } else if (
        order.ORDER_STATUSES.filter(
          (obj) => obj !== "CANCELLED" && obj !== "COMPLETED"
        ).length > 0
      ) {
        order.CLAIMABLE = "🟡 Cannot claim yet.";
      }
    });

    const livestreams = findLiveOrders[0];
    const batchSize = 3; // Number of elements in each subgroup
    const groupedLivestreams = [];

    for (let i = 0; i < livestreams.length; i += batchSize) {
      const batch = livestreams.slice(i, i + batchSize);
      groupedLivestreams.push(batch);
    }

    const embedPages = [];
    let page = 1;

    for (const stream of groupedLivestreams) {
      // let embedDescription = "";
      // stream.forEach((str, index) => {
      //   embedDescription += `### LIVESTREAM ID: \`\`\`${
      //     str.STREAM_ID
      //   }\`\`\`\n**START TIME:** ⏱️ ${moment
      //     .unix(str.START_TIME)
      //     .format("MMM D, YYYY, h:mm A")}\n**END TIME:** ⏱️ ${moment
      //     .unix(str.END_TIME)
      //     .format("MMM D, YYYY, h:mm A")}\n\n**PENDING ORDERS:** ${
      //     str.ORDER_STATUSES.filter(
      //       (obj) => obj !== "CANCELLED" && obj !== "COMPLETED"
      //     ).length
      //   }\n**CANCELLED ORDERS:** ${
      //     str.ORDER_STATUSES.filter((obj) => obj === "CANCELLED").length
      //   }\n**COMPLETED ORDERS:** ${
      //     str.ORDER_STATUSES.filter((obj) => obj === "COMPLETED").length
      //   }\n\n**NET ORDERS SUBTOTAL:** 📦 ${pesoFormatter.format(
      //     str.NET_ORDER_SUBTOTAL
      //   )}\n**NET COMMISSION:** 💰 ${pesoFormatter.format(
      //     str.NET_COMMISSION
      //   )}\n\n`;

      //   if (index !== stream.length - 1) {
      //     embedDescription += "════════════════════════════\n";
      //   }
      // });

      let embedFields = [];
      stream.forEach((str, index) => {
        embedFields.push(
          {
            name: "LIVESTREAM ID",
            value: `${str.STREAM_ID}`,
          },
          {
            name: "DETAILS",
            value: `⏱️ **Start Time:** ${moment
              .unix(str.START_TIME)
              .tz("Asia/Manila")
              .format("MMM D, YYYY, h:mm A")}\n⏱️ **End Time:** ${moment
              .unix(str.END_TIME)
              .tz("Asia/Manila")
              .format("MMM D, YYYY, h:mm A")}\n\n**Pending Orders:** ${
              str.ORDER_STATUSES.filter(
                (obj) => obj !== "CANCELLED" && obj !== "COMPLETED"
              ).length
            }\n**Cancelled Orders:** ${
              str.ORDER_STATUSES.filter((obj) => obj === "CANCELLED").length
            }\n**Completed Orders:** ${
              str.ORDER_STATUSES.filter((obj) => obj === "COMPLETED").length
            }\n\n📦 **Net Orders Subtotal:** ${pesoFormatter.format(
              str.NET_ORDER_SUBTOTAL
            )}\n💰 **Net Commission:** ${pesoFormatter.format(
              str.NET_COMMISSION
            )}\n\u200b`,
          },
          {
            name: "CLAIM STATUS",
            value: `${str.CLAIMABLE}${
              index !== stream.length - 1
                ? "\n\n════════════════════════════\n\u200b"
                : ""
            }`,
          }
        );
      });

      const embed = new EmbedBuilder()
        .setTitle(`📋 LIVE STREAM STATISTICS`)
        // .setDescription(embedDescription)
        .addFields(embedFields)
        .setColor("#26bae4")
        .setTimestamp(Date.now())
        .setAuthor({
          iconURL: interaction.user.displayAvatarURL(),
          name: "Livestreamer: " + interaction.user.globalName,
        })
        .setFooter({
          text: `Page ${page} of ${groupedLivestreams.length}`,
        });

      page++;

      embedPages.push(embed);
    }

    if (embedPages.length === 1) {
      await interaction.editReply({
        embeds: embedPages,
        components: [],
        fetchReply: true,
      });

      return;
    }

    //buttons

    const prev = new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("‹")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const first = new ButtonBuilder()
      .setCustomId("first")
      .setLabel("«")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const next = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("›")
      .setStyle(ButtonStyle.Primary);

    const last = new ButtonBuilder()
      .setCustomId("last")
      .setLabel("»")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(
      first,
      prev,
      next,
      last
    );

    let index = 0;

    const currentPage = await interaction.editReply({
      embeds: [embedPages[index]],
      components: [buttonRow],
      fetchReply: true,
    });

    const collector = await currentPage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) return;

      await i.deferUpdate();

      if (i.customId === "prev") {
        if (index > 0) index--;
      } else if (i.customId === "next") {
        if (index < embedPages.length - 1) index++;
      } else if (i.customId === "first") {
        index = 0;
      } else if (i.customId === "last") {
        index = embedPages.length - 1;
      }

      if (index === 0) {
        first.setDisabled(true).setStyle(ButtonStyle.Secondary);
        prev.setDisabled(true).setStyle(ButtonStyle.Secondary);
      } else {
        first.setDisabled(false).setStyle(ButtonStyle.Primary);
        prev.setDisabled(false).setStyle(ButtonStyle.Primary);
      }

      if (index === embedPages.length - 1) {
        next.setDisabled(true).setStyle(ButtonStyle.Secondary);
        last.setDisabled(true).setStyle(ButtonStyle.Secondary);
      } else {
        next.setDisabled(false).setStyle(ButtonStyle.Primary);
        last.setDisabled(false).setStyle(ButtonStyle.Primary);
      }

      await currentPage.edit({
        embeds: [embedPages[index]],
        components: [buttonRow],
      });

      collector.resetTimer();
    });

    collector.on("end", async (i) => {
      await currentPage.edit({
        embeds: [embedPages[index]],
        components: [],
      });
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
