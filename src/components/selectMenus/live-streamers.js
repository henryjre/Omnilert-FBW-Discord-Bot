const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const mysql = require("mysql2/promise");
const moment = require("moment");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const commissionRates = require("../../commands/tiktokCommands/commission.json");

module.exports = {
  data: {
    name: `live-streamers`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== interaction.message.interaction.user.id) {
      await interaction.reply({
        content: "You cannot use this menu.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.values.length <= 0) return;

    await interaction.deferUpdate();

    const streamerId = interaction.values[0];
    const discordUser = await client.users.fetch(streamerId);

    const claimedEmbed = new EmbedBuilder()
      .setTitle(`RETRIEVING DASHBOARD`)
      .setFooter({
        iconURL: discordUser.displayAvatarURL(),
        text: discordUser.globalName,
      })
      .setColor("#e8fbd4")
      .setDescription("⌛ Retrieving dashboard... Please wait.");

    await interaction.editReply({
      embeds: [claimedEmbed],
      components: [],
    });

    const pool = mysql.createPool({
      host: process.env.logSqlHost,
      port: process.env.logSqlPort,
      user: process.env.logSqlUsername,
      password: process.env.logSqlPassword,
      database: process.env.logSqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        ca: caCertificate,
        rejectUnauthorized: true,
      },
    });

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const backButton = new ButtonBuilder()
      .setCustomId("allDashboardBackButton")
      .setLabel("‹ Back")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(false);

    const backButtonRow = new ActionRowBuilder().addComponents(backButton);

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
          .setFooter({
            iconURL: discordUser.displayAvatarURL(),
            text: discordUser.globalName,
          })
          .setDescription(
            "🔴 Please contact <@748568303219245117> or <@864920050691866654> for this error."
          );

        await interaction.editReply({
          embeds: [noOrdersEmbed],
          components: [backButtonRow],
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

      // Query to get length of rows and sum of ORDER_SUBTOTAL where ORDER_STATUS is not 'CANCELLED' from Tiktok_Livestream_Orders
      const orderStats = await connection.execute(
        "SELECT COUNT(*) AS rowCount, SUM(CASE WHEN ORDER_STATUS = 'CANCELLED' THEN 0 ELSE ORDER_SUBTOTAL END) AS totalSubtotal FROM Tiktok_Livestream_Orders WHERE LIVE_ID LIKE ? GROUP BY STREAM_ID",
        [`%${streamerId}%`]
      );

      let totalOrders = 0;
      let totalSubtotal = 0;
      let totalCommission = 0;

      orderStats[0].forEach((order) => {
        totalOrders += order.rowCount;
        totalSubtotal += Number(order.totalSubtotal);

        const commission = calculateCommission(Number(order.totalSubtotal));
        totalCommission += commission;
      });

      const embed = new EmbedBuilder()
        .setTitle("📊 STREAMER DASHBOARD")
        .setColor("#1f3095")
        .setFooter({
          iconURL: discordUser.displayAvatarURL(),
          text: discordUser.globalName,
        })
        .setTimestamp(Date.now())
        .addFields([
          {
            name: "LIVESTREAMER",
            value: "🪪 | " + discordUser.toString(),
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
        components: [backButtonRow],
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`RETRIEVING DASHBOARD FAILED`)
        .setAuthor({
          iconURL: discordUser.displayAvatarURL(),
          name: "Livestreamer: " + discordUser.globalName,
        })
        .setColor("Red")
        .setDescription(
          "🔴 There was an error while retrieving your dashboard."
        )
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [backButtonRow],
      });
      console.log(error);
    } finally {
      // Close the connection after executing queries
      await connection.release();
      await pool.end();
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
