const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
const moment = require("moment");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("livestream")
    .setDescription("Save the tiktok livestream statistics.")
    .addUserOption((option) =>
      option
        .setName("streamer")
        .setDescription("The streamer of the livestream to end.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("start-time")
        .setDescription(
          "The beginning time of the livestream. E.G. January 1, 2023 8:00 AM"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("end-time")
        .setDescription(
          "The ending time of the livestream. E.G. January 30, 2023 10:00 PM"
        )
        .setRequired(false)
    ),
  async execute(interaction, client) {
    const validRoles = ["1176496361802301462"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this command.`,
        ephemeral: true,
      });
      return;
    }

    const streamer = interaction.options.getUser("streamer");
    const start = interaction.options.getString("start-time");
    const end = interaction.options.getString("end-time");

    if (!start || !end) {
      await interaction.reply({
        content: "Input valid start time and end time.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    if (!interaction.member.roles.cache.has("1117440696891220050")) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`INVALID LIVESTREAMER`)
        .setColor("Red")
        .setDescription(
          `🔴 Cannot record the livestream. ${streamer.toString()} is not a livestreamer.`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const timeDates = convertTime(start, end);

    if (timeDates === null) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`LIVESTREAM ERROR`)
        .setColor("Red")
        .setDescription(
          "🔴 Cannot parse the given time. Please make sure that `start-time` and `end-time` are in correct format: e.g. `3:55 AM` / `12:00 PM`"
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    if (timeDates.end.hour - timeDates.start.hour < 1.5) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`LIVESTREAM ERROR`)
        .setColor("Red")
        .setDescription(
          "🔴 Livestream duration does not meet the minimum required duration (1.5 hours)"
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const apiStartTime = timeDates.start.unix();
    const apiEndTime = timeDates.end.unix();

    const liveId = streamer.id + "_" + moment().format("MMDDYY");
    const streamerName = streamer.globalName;
    const createdDate = moment().format("YYYY-MM-DD HH:mm:ss");

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

    const findDupeQuery =
      "SELECT * FROM Tiktok_Livestream_Schedules WHERE LIVE_ID = ?";
    const findDupe = await connection
      .query(findDupeQuery, [liveId])
      .catch((err) => console.log(err));

    if (findDupe[0].length > 0) {
      const dupeEmbed = new EmbedBuilder()
        .setTitle(`🟡 DUPLICATE LIVESTREAM`)
        .addFields([
          {
            name: `LIVESTREAM ID`,
            value: findDupe[0][0].STREAM_ID,
          },
          {
            name: `LIVE STREAMER`,
            value: findDupe[0][0].STREAMER_NAME,
          },
          {
            name: `STREAM START`,
            value:
              "⏱️ | " +
              moment
                .unix(findDupe[0][0].START_TIME)
                .format("MMM D, YYYY, h:mm A"),
          },
          {
            name: `STREAM END`,
            value:
              "⏱️ | " +
              moment
                .unix(findDupe[0][0].END_TIME)
                .format("MMM D, YYYY, h:mm A"),
          },
        ])
        .setColor("#FCD53F")
        .setFooter({
          text: `Command by: ${interaction.user.globalName}`,
        });

      await interaction.editReply({
        content: `🔴 ERROR: A Livestream with that schedule is already saved.`,
        embeds: [dupeEmbed],
      });
      connection.release();
      pool.end();
      return;
    }

    const ordersResponse = await getOrdersLists(apiStartTime, apiEndTime);

    console.log(ordersResponse);

    let orders;
    if (!ordersResponse.orders || ordersResponse.orders.length <= 0) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`NO LIVESTREAM ORDERS`)
        .setColor("Orange")
        .setDescription(
          "🟠 ERROR: No orders found within that livestream period."
        );

      return await interaction.editReply({
        embeds: [errorEmbed],
      });
    } else {
      orders = ordersResponse.orders;
    }

    const livestreamId = nanoid();

    const ordersMapped = orders.map((obj) => [
      obj.id,
      livestreamId,
      obj.status,
      obj.payment.sub_total,
      liveId,
      streamerName,
      createdDate,
    ]);

    const insertQueryOrders =
      "INSERT INTO Tiktok_Livestream_Orders (ORDER_ID, STREAM_ID, ORDER_STATUS, ORDER_SUBTOTAL, LIVE_ID, STREAMER, CREATED_DATE) VALUES ?";
    await connection
      .query(insertQueryOrders, [ordersMapped])
      .catch((err) => console.log(err));

    const insertQueryLive =
      "INSERT INTO Tiktok_Livestream_Schedules (STREAM_ID, STREAMER_ID, STREAMER_NAME, START_TIME, END_TIME, LIVE_ID) VALUES (?, ?, ?, ?, ?, ?)";
    await connection
      .query(insertQueryLive, [
        livestreamId,
        streamer.id,
        streamer.globalName,
        apiStartTime,
        apiEndTime,
        liveId,
      ])
      .catch((err) => console.log(err));

    connection.release();
    pool.end();

    const embedStartDate = timeDates.start.format("MMM D, YYYY, h:mm A");
    const embedEndDate = timeDates.end.format("MMM D, YYYY, h:mm A");

    const embed = new EmbedBuilder()
      .setTitle(`🟢 TIKTOK LIVESTREAM SAVED`)
      .addFields([
        {
          name: `LIVESTREAM ID`,
          value: livestreamId,
        },
        {
          name: `LIVE STREAMER`,
          value: streamer.globalName,
        },
        {
          name: `STREAM START`,
          value: "⏱️ | " + embedStartDate,
        },
        {
          name: `STREAM END`,
          value: "⏱️ | " + embedEndDate,
        },
      ])
      .setColor("#78B159")
      .setFooter({
        text: `Command by: ${interaction.user.globalName}`,
      });

    await interaction.editReply({
      embeds: [embed],
    });

    async function getOrdersLists(start, end) {
      const url = `https://leviosa.ph/_functions/getTiktokOrderLists?startTime=${start}&endTime=${end}`;
      const options = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.apiKey,
        },
      };

      const response = await fetch(url, options).catch((err) => {
        interaction.editReply({
          content:
            "🔴 FETCH ERROR: An error has occured while fetching secret tokens.",
        });
        return;
      });

      const responseData = await response.json();
      console.log(responseData);
      return responseData;
    }

    function convertTime(startTime12h, endTime12h) {
      try {
        const philippinesOffset = 8 * 60;

        const momentStart = moment(startTime12h, [
          "MMMM D, YYYY h:mm A",
          "MMMM D, YYYY hh:mm A",
        ]).utcOffset(philippinesOffset);;
        const momentEnd = moment(endTime12h, [
          "MMMM D, YYYY h:mm A",
          "MMMM D, YYYY hh:mm A",
        ]).utcOffset(philippinesOffset);;

        return {
          start: momentStart,
          end: momentEnd,
        };
      } catch (error) {
        console.error(`Error: ${error.message}`);
        return null; // or throw the error if you prefer
      }
    }
  },
};
