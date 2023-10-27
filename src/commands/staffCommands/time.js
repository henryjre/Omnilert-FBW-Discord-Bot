const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
require("dotenv").config({ path: "src/.env" });
const moment = require("moment");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("time")
    .setDescription("Check your total work time."),
  async execute(interaction, client) {
    await interaction.deferReply();

    const doc = new GoogleSpreadsheet(process.env.sheetId);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    ///
    const logSheet = doc.sheetsByTitle["LOGS"];

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
      await interaction.editReply({
        content: "You cannot use this command.",
      });
      return;
    }

    function getLatestPastMonday() {
      const today = moment();
      const dayOfWeek = today.isoWeekday(); // 1 for Monday, 2 for Tuesday, etc.
      const daysSinceMonday = (dayOfWeek - 1 + 7) % 7; // Calculate the number of days since the last Monday
      const latestPastMonday = today.subtract(daysSinceMonday, "days");
      return latestPastMonday;
    }

    const latestMonday = getLatestPastMonday();

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

    const totalHours = (totalSum / 60).toFixed(2);
    const minimumHours = 30;
    let description;
    if (totalHours >= minimumHours) {
      description = `✅ You have reached the minimum required hours for this week.`;
    } else {
      const hoursRemaining = minimumHours - totalHours;
      description = `❌ You need **${hoursRemaining}** more ${
        hoursRemaining === 1 ? "hour" : "hours"
      } reached the minimum required hours for this week.`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`WORK TIME CHECK`)
      .setDescription(description)
      .setColor(totalHours > minimumHours ? "#33ff00" : "#ff0000")
      .addFields([
        {
          name: `CURRENT WORKING HOURS`,
          value: `⏱️ ${totalHours} hours`,
        },
      ]);

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
