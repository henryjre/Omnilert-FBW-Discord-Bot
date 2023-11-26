const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
require("dotenv").config({ path: "src/.env" });
const moment = require("moment");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const mysql = require("mysql2/promise");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("time")
    .setDescription("Check your total work time."),
  async execute(interaction, client) {
    const eligible = [
      "762612635605663767",
      "851719358430576641",
      "1120869673974649035",
      "748568303219245117",
      "719135399859060796",
    ];

    const userId = interaction.user.id;
    const userName = interaction.user.username;

    if (!eligible.includes(userId)) {
      await interaction.reply({
        content: "You cannot use this command.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const doc = new GoogleSpreadsheet(process.env.sheetId);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    ///
    const logSheet = doc.sheetsByTitle["LOGS"];

    const currentDate = moment();

    const daysUntilMonday = (currentDate.day() + 7 - 1) % 7;
    const latestMonday = currentDate
      .subtract(daysUntilMonday, "days")
      .startOf("day");

    console.log(latestMonday.format("MMM D, YYYY, h:mm A"));
    const rows = await logSheet.getRows();

    const filtreredRows = rows
      .filter(
        (r) =>
          r._rawData[1] === userName &&
          moment(r._rawData[2], "MMM D, YYYY, h:mm A").isSameOrAfter(
            latestMonday
          )
      )
      .map((r) => r._rawData[4]);

    let totalSum = 0;
    for (let i = 0; i < filtreredRows.length; i++) {
      totalSum += parseInt(filtreredRows[i], 10);
    }

    const totalHours = Math.floor(totalSum / 60);
    const minutes = totalSum % 60;

    const minimumHours = 30;
    const minimumMinutes = 1800;
    let description;
    if (totalSum >= minimumMinutes) {
      description = `✅ You have reached the minimum required hours for this week.`;
    } else {
      const hoursRemaining = minimumMinutes - totalSum;
      const neededHours = Math.floor(hoursRemaining / 60);
      const neededMinutes = hoursRemaining % 60;

      description = `❌ You need **${neededHours} ${
        neededHours === 1 ? "hour" : "hours"
      } and ${neededMinutes} ${
        neededMinutes === 1 ? "minute" : "minutes"
      }** more to reach the minimum required time for this week.`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`WORK TIME CHECK`)
      .setDescription(description)
      .setColor(totalSum >= minimumMinutes ? "Green" : "Red")
      .addFields([
        {
          name: `CURRENT WORK DURATION`,
          value: `⏱️ ${totalHours} hours and ${minutes} minutes`,
        },
      ]);

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
