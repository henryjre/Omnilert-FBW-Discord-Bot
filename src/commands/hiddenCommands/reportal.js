const schedule = require("node-schedule");
const { EmbedBuilder } = require("discord.js");

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");
const pool = require("../../sqlConnectionPool");

const ttsReminders = require("./reminderTts.json");

let reminders = [];
let penalty = {};
module.exports = {
  name: "reportal",
  async execute(message, threadId, client, type) {
    const author = message.type === 2 ? message.user : message.author;

    const thread = message.guild.channels.cache.get(threadId);

    const channelId = thread.id;
    const member = message.guild.members.cache.get(author.id);

    if (type === 0) {
      const queryWorkShiftString =
        "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
      const workShift = await pool
        .query(queryWorkShiftString, [author.id])
        .catch((err) => console.log(err));

      if (workShift[0].length <= 0) return;
    }

    const reminderStart = Date.now();

    function calculateReminder(minutes) {
      const nextSchedule = new Date(reminderStart + minutes * 60000);
      // const nextSchedule = new Date(penaltyTimestampOnStart + 20 * 1000);
      return nextSchedule;
    }

    function calculateNextPenalty() {
      const nextSchedule = new Date(reminderStart + 30 * 60000);
      return nextSchedule;
    }

    const reminderIndex = reminders.findIndex((r) => r.id === channelId);
    if (reminderIndex !== -1) {
      await reminders[reminderIndex].first.cancel();
      await reminders[reminderIndex].second.cancel();
    }

    !penalty[channelId] ? {} : await penalty[channelId].cancel();

    if (type === 0) {
      console.log(`Resetting reminders for ${member.nickname}`);
      const first_reminder = schedule.scheduleJob(
        `FIRST REMINDER: ${member.nickname}`,
        calculateReminder(15),
        () => {
          firstReminder();
          checkSchedules();
        }
      );

      const second_reminder = schedule.scheduleJob(
        `SECOND REMINDER: ${member.nickname}`,
        calculateReminder(29),
        () => {
          secondReminder();
          checkSchedules();
        }
      );

      if (reminderIndex !== -1) {
        reminders[reminderIndex].first = first_reminder;
        reminders[reminderIndex].second = second_reminder;
      } else {
        reminders.push({
          id: channelId,
          first: first_reminder,
          second: second_reminder,
        });
      }

      penalty[channelId] = schedule.scheduleJob(
        `PENALTY: ${member.nickname}`,
        calculateNextPenalty(),
        () => {
          penalizeUser();
          checkSchedules();
        }
      );
    } else {
      thread.send({
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
      let counter = 0;
      console.log("-----------------------------------------");
      for (const jobName in scheduledJobs) {
        if (counter % 6 === 0 || counter % 6 === 3) {
          console.log("-----------------------------------------");
        }
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
        counter++;
      }
      console.log("-----------------------------------------");
    }

    checkSchedules();

    async function penalizeUser() {
      const connection = await pool
        .getConnection()
        .catch((err) => console.log(err));

      const parentChannel = await client.channels.cache.get(thread.parentId);

      try {
        const queryWorkShiftString =
          "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
        const workShift = await connection
          .query(queryWorkShiftString, [member.user.id])
          .catch((err) => console.log(err));

        const workId = workShift[0][0].ID;
        const timeIn = workShift[0][0].TIME_IN;
        const timeOut = Date.now();

        const timeInStamp = new Date(timeIn).toLocaleDateString("en-PH", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        });

        const timeOutStamp = new Date(timeOut).toLocaleDateString("en-PH", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        });

        const duration = timeOut - timeIn;
        const { hours, minutes } = convertMilliseconds(duration);
        const minutesOnly = Math.floor(duration / 60000);

        const doc = new GoogleSpreadsheet(process.env.sheetId);
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo();

        let logSheet;
        let updateQuery;
        if (member.roles.cache.has("1185935514042388520")) {
          updateQuery =
            "UPDATE Executives SET TIME_RENDERED = (TIME_RENDERED + ?) WHERE MEMBER_ID = ?";
          logSheet = doc.sheetsByTitle["LOGS"];
        } else {
          updateQuery =
            "UPDATE Sub_Members SET TIME_RENDERED = (TIME_RENDERED + ?) WHERE MEMBER_ID = ?";
          logSheet = doc.sheetsByTitle["SUB_MEMBER_LOGS"];
        }

        await logSheet.addRow([
          workId,
          member.user.username,
          timeInStamp,
          timeOutStamp,
          `${minutesOnly}`,
        ]);

        const updateWorkShiftString =
          "UPDATE WORK_HOURS SET TIME_OUT = ? WHERE ID = ?";
        await connection
          .query(updateWorkShiftString, [timeOut, workId])
          .catch((err) => console.log(err));

        await connection
          .query(updateQuery, [minutesOnly, member.user.id])
          .catch((err) => console.log(err));

        const embed = new EmbedBuilder()
          .setTitle(`🔴 LOG OUT`)
          .setDescription(
            `👤 **User:** ${member.nickname}\n⏱️ **Time In:** ${timeInStamp}\n⏱️ **Time Out:** ${timeOutStamp}\n⏳ **Duration:** ${hours} hours and ${minutes} minutes`
          )
          .setColor("Red")
          // .setTimestamp(timeStamp)
          .setFooter({
            iconURL: member.user.displayAvatarURL(),
            text: "Leviosa Philippines",
          });

        await thread.send({
          embeds: [embed],
        });

        await thread.members.remove(member.user.id);
        await thread.setLocked(true);
        await thread.setArchived(true);

        const threadCreatedMessages = await parentChannel.messages
          .fetch()
          .then((messages) => {
            return messages.filter((m) => m.author.bot && m.type === 18);
          });

        const lastThreadCreated = await threadCreatedMessages.find(
          (t) => t.reference.channelId === thread.id
        );

        await lastThreadCreated.delete();

        const channelThreads = parentChannel.threads;
        const activeThreads = await channelThreads.fetchActive();
        if (activeThreads.threads.size <= 0) {
          await parentChannel.setName(parentChannel.name.replace("🟢", "🔴"));
        }
      } catch (error) {
        console.log(error);
        await thread.send({
          content: `<@748568303219245117>, there was an error while recording the penalty for ${member.nickname}.`,
        });
      } finally {
        await connection.release();
      }

      function convertMilliseconds(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return { hours, minutes };
      }
    }

    function firstReminder() {
      const randomIndex = Math.floor(Math.random() * ttsReminders.length);
      const randomTts = ttsReminders[randomIndex];

      const reminderEmbed = new EmbedBuilder()
        .setDescription(
          `##  🔔 15-MINUTE REMINDER\nThis is a reminder that you have 15 minutes to send an update to this channel before you get automatically outed.`
        )
        .setColor("Yellow")
        .setTimestamp(Date.now())
        .setFooter({
          iconURL: client.user.displayAvatarURL(),
          text: "Leviosa Philippines",
        });

      thread.send({
        content: author.toString() + " " + randomTts.reminder,
        embeds: [reminderEmbed],
        tts: true,
      });
    }

    function secondReminder() {
      const reminderEmbed = new EmbedBuilder()
        .setDescription(
          `##  🔔 1-MINUTE REMINDER\nThis is a reminder that you only have 1 minute to send an update to this channel before you get automatically outed.`
        )
        .setColor("LuminousVividPink")
        .setTimestamp(Date.now())
        .setFooter({
          iconURL: client.user.displayAvatarURL(),
          text: "Leviosa Philippines",
        });

      thread.send({
        content: author.toString(),
        embeds: [reminderEmbed],
      });
    }
  },
};
