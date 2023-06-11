const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("out")
    .setDescription("Log out of your current shift."),
  async execute(interaction, client) {
    const pool = mysql.createPool({
      host: process.env.logSqlHost,
      user: process.env.logSqlUsername,
      password: process.env.logSqlPassword,
      database: process.env.logSqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const userId = interaction.user.id;
    const timeOut = Date.now();

    const timeStamp = new Date(timeOut).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const queryWorkShiftString =
      "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
    const workShift = await connection
      .query(queryWorkShiftString, [userId])
      .catch((err) => console.log(err));

    if (workShift[0].length <= 0) {
      await interaction.reply({
        content: `🔴 ERROR: No work log in found.`,
      });
      return;
    }

    const workId = workShift[0][0].ID;
    const timeIn = workShift[0][0].TIME_IN;

    const timeInStamp = new Date(timeIn).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const updateWorkShiftString =
      "UPDATE WORK_HOURS SET TIME_OUT = ? WHERE ID = ?";
    await connection
      .query(updateWorkShiftString, [timeOut, workId])
      .catch((err) => console.log(err));

    const queryWorkLogString =
      "SELECT * FROM WORK_LOGS WHERE TIMESTAMP < ? AND TIMESTAMP > ? AND DISCORD_ID = ?";
    const workLogs = await connection
      .query(queryWorkLogString, [timeOut, timeIn, userId])
      .catch((err) => console.log(err));

    connection.release();

    const duration = timeOut - timeIn;
    const { hours, minutes } = convertMilliseconds(duration);

    const doc = new GoogleSpreadsheet(process.env.sheetId);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const logSheet = doc.sheetsByTitle["LOGS"];

    await logSheet.addRow([
      workId,
      interaction.user.username,
      timeInStamp,
      timeStamp,
      `${hours} hours and ${minutes} minutes`,
    ]);

    var description = "";
    workLogs[0].forEach((log, index) => {
      description += `\n**${index + 1}** ${log.LOG}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🔴 LOG OUT`)
      .setDescription(
        `👤 **User:** ${interaction.user.username}\n⏱️ **Time In:** ${timeInStamp}\n⏱️ **Time Out:** ${timeStamp}\n⏱️ **Duration:** ${hours} hours and ${minutes} minutes`
      )
      .setColor("Red")
      // .setTimestamp(timeStamp)
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: "Leviosa Network",
      });

    const summaryEmbed = new EmbedBuilder()
      .setTitle(`🔵 WORK SUMMARY`)
      .setAuthor({
        name: interaction.user.username,
      })
      .setDescription(
        `👤 **User:** ${interaction.user.username}\n⏱️ **Time In:** ${timeInStamp}\n⏱️ **Time Out:** ${timeStamp}\n⏱️ **Duration:** ${hours} hours and ${minutes} minutes\n\n🧾 **Work Logs:**${description}`
      )
      .setColor("Blue")
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: "Leviosa Network",
      });

    await interaction.reply({
      embeds: [embed],
    });

    await client.channels.cache.get("1117121221608354015").send({
      embeds: [summaryEmbed],
    });

    function convertMilliseconds(milliseconds) {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return { hours, minutes };
    }
  },
};
