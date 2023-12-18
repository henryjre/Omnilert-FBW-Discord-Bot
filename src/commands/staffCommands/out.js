const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("out")
    .setDescription("Log out of your current shift."),
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

    const userId = interaction.user.id;
    const timeOut = Date.now();

    const timeStamp = new Date(timeOut).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    client.commands.get("reminder").execute(interaction, client, 1);

    const queryWorkShiftString =
      "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
    const workShift = await connection
      .query(queryWorkShiftString, [userId])
      .catch((err) => console.log(err));

    if (workShift[0].length <= 0) {
      await interaction.editReply({
        content: `🔴 ERROR: No work log in found.`,
      });
      await connection.release();
      await pool.end();
      return;
    }

    const workId = workShift[0][0].ID;
    const timeIn = workShift[0][0].TIME_IN;

    const timeInStamp = new Date(timeIn).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    try {
      const duration = timeOut - timeIn;
      const { hours, minutes } = convertMilliseconds(duration);
      const minutesOnly = Math.floor(duration / 60000);

      const doc = new GoogleSpreadsheet(process.env.sheetId);
      await doc.useServiceAccountAuth(creds);
      await doc.loadInfo();
      ///
      const logSheet = doc.sheetsByTitle["LOGS"];

      await logSheet.addRow([
        workId,
        interaction.user.username,
        timeInStamp,
        timeStamp,
        `${minutesOnly}`,
      ]);

      const updateWorkShiftString =
        "UPDATE WORK_HOURS SET TIME_OUT = ? WHERE ID = ?";
      await connection
        .query(updateWorkShiftString, [timeOut, workId])
        .catch((err) => console.log(err));

      const embed = new EmbedBuilder()
        .setTitle(`🔴 LOG OUT`)
        .setDescription(
          `👤 **User:** ${interaction.user.globalName}\n⏱️ **Time In:** ${timeInStamp}\n⏱️ **Time Out:** ${timeStamp}\n⏳ **Duration:** ${hours} hours and ${minutes} minutes`
        )
        .setColor("Red")
        // .setTimestamp(timeStamp)
        .setFooter({
          iconURL: interaction.user.displayAvatarURL(),
          text: "Leviosa Network",
        });

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply({
        content:
          "There was an error while recording your work time, please try again.",
        ephemeral: true,
      });
    } finally {
      await connection.release();
      await pool.end();
    }

    function convertMilliseconds(milliseconds) {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return { hours, minutes };
    }
  },
};
