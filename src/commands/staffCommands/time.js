const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("time")
    .setDescription("Check your total work time."),
  async execute(interaction, client) {
    const validRoles = ["1185935514042388520", "1187702183802720327"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520> & <@&1187702183802720327>.`,
        ephemeral: true,
      });
      return;
    }

    const userId = interaction.user.id;
    const userName = interaction.user.username;

    await interaction.deferReply();

    const doc = new GoogleSpreadsheet(process.env.sheetId);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    ///
    let logSheet;
    const coreRole = ["1185935514042388520"];

    if (interaction.member.roles.cache.some((r) => coreRole.includes(r.id))) {
      logSheet = doc.sheetsByTitle["LOGS"];
    } else {
      logSheet = doc.sheetsByTitle["SUB_MEMBER_LOGS"];
    }

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
