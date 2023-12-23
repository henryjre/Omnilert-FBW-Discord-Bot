const schedule = require("node-schedule");
const { EmbedBuilder } = require("discord.js");

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");
const pool = require("../../sqlConnectionPool");

let reminder = {};
let hourlyReminders = {};
let penalty = {};
module.exports = {
  name: "reminder",
  async execute(message, client, type) {
    const author = message.type === 2 ? message.user : message.author;
    const channelId = message.channelId;
    const member = interaction.guild.members.cache.get(author.id);

    if (type === 0) {
      const queryWorkShiftString =
        "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
      const workShift = await pool
        .query(queryWorkShiftString, [author.id])
        .catch((err) => console.log(err));

      if (workShift[0].length <= 0) return;
    }

    let penaltyTimestampOnStart = Date.now();

    function calculateHourlyReminder() {
      // hourRemindetTimestampOnStart = Date.now();
      const nextSchedule = new Date(penaltyTimestampOnStart + 60 * 60000);
      return nextSchedule;
    }

    function calculateHourAndHalfReminder() {
      // reminderTimestampOnStart = Date.now();
      const nextSchedule = new Date(penaltyTimestampOnStart + 90 * 60000);
      return nextSchedule;
    }

    function calculateNextPenalty() {
      penaltyTimestampOnStart = Date.now();
      const nextSchedule = new Date(
        penaltyTimestampOnStart + (2 * 60 * 60 + 60) * 1000
      );
      return nextSchedule;
    }

    !reminder[channelId] ? {} : reminder[channelId].cancel();
    !hourlyReminders[channelId] ? {} : hourlyReminders[channelId].cancel();
    !penalty[channelId] ? {} : penalty[channelId].cancel();

    if (type === 0) {
      console.log(`Resetting reminders for ${member.nickname}`);
      reminder[channelId] = schedule.scheduleJob(
        `IN 1 HOUR AND 30 MINS: ${author.username}`,
        calculateHourAndHalfReminder(),
        () => {
          remindUserHourAndHalf();
          checkSchedules();
        }
      );

      hourlyReminders[channelId] = schedule.scheduleJob(
        `IN 1 HOUR: ${author.username}`,
        calculateHourlyReminder(),
        () => {
          remindUserHourly();
          checkSchedules();
        }
      );

      penalty[channelId] = schedule.scheduleJob(
        `PENALTY: ${author.username}`,
        calculateNextPenalty(),
        () => {
          penalizeUser(author);
          const nextSchedule = calculateNextPenalty();
          penalty[channelId].reschedule(nextSchedule);
          const nextHourly = calculateHourlyReminder();
          hourlyReminders[channelId].reschedule(nextHourly);
          const nextHalfHour = calculateHourAndHalfReminder();
          reminder[channelId].reschedule(nextHalfHour);
          checkSchedules();
        }
      );
    } else {
      client.channels.cache.get(channelId).send({
        content: `Cancelled reminders for ${member.nickname}`,
      });
      checkSchedules();
    }

    function checkSchedules() {
      const scheduledJobs = schedule.scheduledJobs;
      if (scheduledJobs.length <= 0) {
        console.log("No schedules found");
        return;
      }
      console.log("-----------------------------------------");
      for (const jobName in scheduledJobs) {
        const job = scheduledJobs[jobName];
        const nextRuntime = new Date(job.nextInvocation()).toLocaleDateString(
          "en-PH",
          {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }
        );
        console.log(`Schedule name: ${jobName}`);
        console.log(`Next run time: ${nextRuntime}`);
      }
      console.log("-----------------------------------------");
    }

    checkSchedules();

    async function penalizeUser(author) {
      const doc = new GoogleSpreadsheet(process.env.sheetId);
      await doc.useServiceAccountAuth(creds);
      await doc.loadInfo();

      const penaltyTimeStamp = Date.now();
      const duration = Math.ceil(
        (penaltyTimeStamp - penaltyTimestampOnStart) / 60000
      );

      const timeOnStart = new Date(penaltyTimestampOnStart).toLocaleDateString(
        "en-PH",
        {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }
      );
      const penaltyDate = new Date().toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
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
    }

    function remindUserHourAndHalf() {
      const reminderEmbed = new EmbedBuilder()
        .setTitle(`🔔 HALF HOUR REMINDER`)
        .setDescription(
          `This is a reminder that you have 30 minutes to send an update to this channel before penalty.`
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

    function remindUserHourly() {
      const reminderEmbed = new EmbedBuilder()
        .setTitle(`🔔 HOURLY REMINDER`)
        .setDescription(
          `This is a reminder that you have 1 hour to send an update to this channel before penalty.`
        )
        .setColor("Blue")
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
