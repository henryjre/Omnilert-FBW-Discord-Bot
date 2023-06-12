const schedule = require("node-schedule");
const { EmbedBuilder, channelLink } = require("discord.js");

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");

let reminder = {};
let penalty = {};
module.exports = {
  name: "reminder",
  async execute(message, client, type) {
    const author = message.type === 0 ? message.author : message.user;
    const channelId = message.channelId;

    let timeStampOnStart = Date.now();

    !reminder[channelId] ? {} : reminder[channelId].cancel();
    !penalty[channelId] ? {} : penalty[channelId].cancel();

    if (type === 0) {
      console.log(`Resetting reminders for ${author.username}`);
      reminder[channelId] = schedule.scheduleJob("*/45 * * * *", () => {
        remindUser();
      });

      penalty[channelId] = schedule.scheduleJob("0 * * * *", () => {
        penalizeUser(author);
      });
    } else {
      console.log(`Cancelled reminders for ${author.username}`);
      reminder[channelId].cancel();
      penalty[channelId].cancel();
    }

    async function penalizeUser(author) {
      const doc = new GoogleSpreadsheet(process.env.sheetId);
      await doc.useServiceAccountAuth(creds);
      await doc.loadInfo();

      const penaltyTimeStamp = Date.now();
      const duration = Math.ceil((penaltyTimeStamp - timeStampOnStart) / 60000);

      const timeOnStart = new Date(timeStampOnStart).toLocaleDateString(
        "en-PH",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }
      );
      const penaltyDate = new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      const logSheet = doc.sheetsByTitle["PENALTY"];

      await logSheet.addRow([
        author.username,
        timeOnStart,
        penaltyDate,
        `${duration} minutes`,
      ]);

      const penaltyEmbed = new EmbedBuilder()
        .setTitle(`⛔ PENALTY`)
        .setDescription(
          `**Last Update:** ${timeOnStart}\n**Penalty Time:** ${penaltyDate}\n**Duration:** ${duration} minutes`
        )
        .setColor("Red")
        .setTimestamp(Date.now())
        .setFooter({
          iconURL: client.user.displayAvatarURL(),
          text: "Leviosa Network",
        });

      client.channels.cache.get(message.channelId).send({
        content: author.toString(),
        embeds: [penaltyEmbed],
      });

      timeStampOnStart = penaltyTimeStamp;
    }

    function remindUser() {
      const reminderEmbed = new EmbedBuilder()
        .setTitle(`🔔 REMINDER`)
        .setDescription(
          `This is a reminder that you have 15 minutes to send an update to this channel before penalty.`
        )
        .setColor("Yellow")
        .setTimestamp(Date.now())
        .setFooter({
          iconURL: client.user.displayAvatarURL(),
          text: "Leviosa Network",
        });

      client.channels.cache.get(message.channelId).send({
        content: author.toString(),
        embeds: [reminderEmbed],
      });
    }
  },
};
