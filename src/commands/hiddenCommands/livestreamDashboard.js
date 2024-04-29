const { EmbedBuilder } = require("discord.js");
const moment = require("moment");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const conn = require("../../sqlConnection");

const commissionRates = require("../tiktokCommands/commission.json");

module.exports = {
  name: "livestreamDashboard",
  async execute(interaction, client) {
    const streamerId = interaction.user.id;

    const connection = await conn.managementConnection();

    try {
      // Query to get BALANCE from Tiktok_Livestreamers
      const [balanceRows] = await connection.execute(
        "SELECT * FROM Tiktok_Livestreamers WHERE STREAMER_ID = ?",
        [streamerId]
      );

      if (balanceRows.length <= 0) {
        const noOrdersEmbed = new EmbedBuilder()
          .setTitle(`NO DASHBOARD FOUND`)
          .setColor("Red")
          .setDescription(
            "🔴 Please contact <@748568303219245117> or <@864920050691866654> for this error."
          );

        await interaction.editReply({
          embeds: [noOrdersEmbed],
        });
      }
      const balance = balanceRows[0].BALANCE;
      const liab = balanceRows[0].LIABILITIES;

      // Query to get total number of rows and average duration between START_TIME and END_TIME from Tiktok_Livestream_Schedules
      const [scheduleStats] = await connection.execute(
        "SELECT COUNT(*) AS totalRows, AVG(END_TIME - START_TIME) AS avgDuration FROM Tiktok_Livestream_Schedules WHERE STREAMER_ID = ?",
        [streamerId]
      );
      const totalStreams = scheduleStats[0].totalRows;
      const avgTime = moment.duration(scheduleStats[0].avgDuration, "seconds");

      let avgDuration;
      if (avgTime.hours()) {
        if (avgTime.minutes()) {
          avgDuration = `${avgTime.hours()} ${
            avgTime.hours() <= 1 ? "hour" : "hours"
          } and ${avgTime.minutes()} ${
            avgTime.minutes() <= 1 ? "minute" : "minutes"
          }`;
        } else {
          avgDuration = `${avgTime.hours()} ${
            avgTime.hours() <= 1 ? "hour" : "hours"
          }`;
        }
      } else {
        avgDuration = `${avgTime.minutes()} ${
          avgTime.minutes() <= 1 ? "minute" : "minutes"
        }`;
      }

      const findLiveOrdersQuery =
        "SELECT s.STREAM_ID, COUNT(o.ORDER_ID) AS ORDER_COUNT, " +
        "SUM(CASE WHEN o.ORDER_STATUS = 'CANCELLED' THEN 0 ELSE o.ORDER_SUBTOTAL END) AS NET_ORDER_SUBTOTAL " +
        "FROM Tiktok_Livestream_Schedules s " +
        "LEFT JOIN Tiktok_Livestream_Orders o ON s.STREAM_ID = o.STREAM_ID " +
        "WHERE s.LIVE_ID LIKE ? " +
        "GROUP BY s.STREAM_ID";

      const orderStats = await connection.execute(findLiveOrdersQuery, [
        `%${streamerId}%`,
      ]);

      let totalOrders = 0;
      let totalSubtotal = 0;
      let totalCommission = 0;

      orderStats[0].forEach((order) => {
        totalOrders += order.ORDER_COUNT;
        totalSubtotal += order.NET_ORDER_SUBTOTAL
          ? Number(order.NET_ORDER_SUBTOTAL)
          : 0;

        const commission = calculateCommission(
          Number(order.NET_ORDER_SUBTOTAL)
        );
        totalCommission += commission;
      });

      const embed = new EmbedBuilder()
        .setTitle("📊 STREAMER DASHBOARD")
        .setColor("#1f3095")
        .setTimestamp(Date.now())
        .addFields([
          {
            name: "LIVESTREAMER",
            value: "🪪 | " + interaction.user.toString(),
          },
          {
            name: "CURRENT BALANCE",
            value: `💰 | ${pesoFormatter.format(Number(balance))}`,
          },
          {
            name: "CURRENT LIABILITIES",
            value: `🪙 | ${pesoFormatter.format(Number(liab))}`,
          },
          {
            name: "TOTAL STREAMS",
            value: "🎥 | " + totalStreams + " livestreams",
          },
          {
            name: "TOTAL STREAM SALES",
            value: "📦 | " + pesoFormatter.format(Number(totalSubtotal)),
          },
          {
            name: "TOTAL LIVESTREAM ORDERS MADE",
            value: "🛒 | " + totalOrders + " orders",
          },
          {
            name: "LIFETIME NET COMMISSION",
            value: "💸 | " + pesoFormatter.format(totalCommission),
          },
          {
            name: "AVERAGE STREAM DURATION",
            value: "⏱️ | " + avgDuration,
          },
        ]);

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`RETRIEVING DASHBOARD`)
        .setAuthor({
          iconURL: interaction.user.displayAvatarURL(),
          name: "Livestreamer: " + interaction.user.globalName,
        })
        .setColor("Red")
        .setDescription(
          "🔴 There was an error while retrieving your dashboard."
        )
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
      console.log(error);
    } finally {
      // Close the connection after executing queries
      await connection.end();
    }

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
