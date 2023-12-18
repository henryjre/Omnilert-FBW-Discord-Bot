const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("in")
    .setDescription("Log in to start work shift."),
  async execute(interaction, client) {
    await interaction.deferReply();

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

    const id = nanoid();
    const userId = interaction.user.id;
    const timeIn = Date.now();

    const queryIn =
      "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
    const workShift = await connection
      .query(queryIn, [userId])
      .catch((err) => console.log(err));

    if (workShift[0].length > 0) {
      await interaction.editReply({
        content: `🔴 ERROR: You currently have a running shift. Please use /out to log out before logging in.`,
      });
      connection.release();
      pool.end();
      return;
    }

    client.commands.get("reminder").execute(interaction, client, 0);

    const timeOpts = {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };

    const timeStamp = new Date(timeIn).toLocaleDateString("en-PH", timeOpts);

    const nextPenalty = new Date(
      timeIn + (2 * 60 * 60 + 60) * 1000
    ).toLocaleDateString("en-PH", timeOpts);

    const queryWorkShiftString =
      "INSERT INTO WORK_HOURS (ID, DISCORD_ID, TIME_IN) VALUES (?, ?, ?)";
    await connection
      .query(queryWorkShiftString, [id, userId, timeIn])
      .catch((err) => console.log(err));

    connection.release();
    pool.end();

    const embed = new EmbedBuilder()
      .setTitle(`🟢 LOG IN`)
      .setDescription(
        `👤 **User:** ${interaction.user.globalName}\n⏱️ **Time In:** ${timeStamp}\n⏱️ **Penalty Time:** ${nextPenalty}`
      )
      .setColor("Green")
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: "Leviosa Network",
      });

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
