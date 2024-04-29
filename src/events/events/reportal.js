const schedule = require("node-schedule");
const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const conn = require("../../sqlConnection");

const ttsReminders = require("../../commands/hiddenCommands/reminderTts.json");

let reminders = [];
let penalty = {};
module.exports = {
  name: "reportal",
  async execute(message, threadId, client, type) {
    const author = [3, 2].includes(message.type)
      ? message.user
      : message.author;
    const thread = message.guild.channels.cache.get(threadId);

    try {
      const mgmt_connection = await conn.managementConnection();

      const channelId = thread.id;
      const member = message.guild.members.cache.get(author.id);

      try {
        if (type === 0) {
          const queryReportal =
            "SELECT * FROM Executive_Reportals WHERE EXECUTIVE_ID = ? AND TIME_OUT_UNIX IS NULL";
          const [reportal] = await mgmt_connection.query(queryReportal, [
            author.id,
          ]);

          if (reportal.length <= 0) return;
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
            calculateReminder(Date.now(), 15),
            () => {
              firstReminder();
              checkSchedules();
            }
          );

          const second_reminder = schedule.scheduleJob(
            `SECOND REMINDER: ${member.nickname}`,
            calculateReminder(Date.now(), 27),
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
            calculateNextPenalty(Date.now()),
            () => {
              penalizeUser(member);
              checkSchedules();
            }
          );
        } else {
          thread.send({
            content: `Cancelled reminders for ${member.nickname}`,
          });
          checkSchedules();
          return;
        }

        checkSchedules();
      } finally {
        await mgmt_connection.end();
      }
    } catch (error) {
      console.log(error.stack);
      await thread.send({
        content: `🔴 ERROR: ${error.message}.`,
      });
    }

    function calculateReminder(time, minutes) {
      const nextSchedule = new Date(time + minutes * 60000);
      // const nextSchedule = new Date(penaltyTimestampOnStart + 20 * 1000);
      return nextSchedule;
    }

    function calculateNextPenalty(time) {
      const nextSchedule = new Date(time + 30 * 60000);
      return nextSchedule;
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

    async function penalizeUser(member) {
      try {
        const mgmt_connection = await conn.managementConnection();
        try {
          const parentChannel = await client.channels.cache.get(
            thread.parentId
          );

          const queryShift =
            "SELECT * FROM Executive_Reportals WHERE EXECUTIVE_ID = ? AND TIME_OUT_UNIX IS NULL";
          const [reportal] = await mgmt_connection.query(queryShift, [
            member.user.id,
          ]);

          const workId = reportal[0].ID;
          const taskId = reportal[0].TASK_ID;
          const timeIn = reportal[0].TIME_IN_UNIX;
          const timeOut = Date.now();

          const timeInStamp = moment
            .unix(timeIn / 1000)
            .tz("Asia/Manila")
            .format("MMM DD, YYYY hh:mm A");
          const timeOutStamp = moment
            .unix(timeOut / 1000)
            .tz("Asia/Manila")
            .format("MMM DD, YYYY hh:mm A");

          const duration = timeOut - timeIn;

          const { hours, minutes } = convertMilliseconds(duration);
          const minutesOnly = Math.floor(duration / 60000);

          try {
            await mgmt_connection.beginTransaction();

            const updateQuery =
              "UPDATE Executives SET TIME_RENDERED = (TIME_RENDERED + ?) WHERE MEMBER_ID = ?";
            await mgmt_connection.query(updateQuery, [
              minutesOnly,
              member.user.id,
            ]);

            const updateWorkShiftString =
              "UPDATE Executive_Reportals SET TIME_OUT_UNIX = ? WHERE ID = ?";
            await mgmt_connection.query(updateWorkShiftString, [
              timeOut,
              workId,
            ]);

            const updateTasks =
              "UPDATE Executive_Tasks SET TIME_RENDERED = (TIME_RENDERED + ?) WHERE TASK_ID = ?";
            await mgmt_connection.query(updateTasks, [minutesOnly, taskId]);

            await mgmt_connection.commit();
            console.log("Transaction committed successfully.");
          } catch (error) {
            await mgmt_connection.rollback();
            console.error("Transaction rolled back due to error:", error);
          }

          const embed = new EmbedBuilder()
            .setTitle(`🔴 LOG OUT`)
            .setDescription(
              `👤 **User:** ${member.nickname}\n⏱️ **Time In:** ${timeInStamp}\n⏱️ **Time Out:** ${timeOutStamp}\n⏳ **Duration:** ${hours} hours and ${minutes} minutes`
            )
            .setColor("Red");

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
        } finally {
          await mgmt_connection.end();
        }
      } catch (error) {
        console.log(error.stack);
        await thread.send({
          content: `🔴 PENALTY ERROR: ${error.message}.`,
        });
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
          `##  🔔 LAST 3 MINUTES\nThis is a reminder that you only have 3 minutes to send an update to this channel before you get automatically outed.`
        )
        .setColor("LuminousVividPink")
        .setTimestamp(Date.now())
        .setFooter({
          iconURL: client.user.displayAvatarURL(),
          text: "Leviosa Philippines",
        });

      thread.send({
        content:
          author.toString() +
          ", This is your last warning. You only have 3 minutes left to update on this channel before you get kicked out of the thread.",
        embeds: [reminderEmbed],
        tts: true,
      });
    }
  },
};
