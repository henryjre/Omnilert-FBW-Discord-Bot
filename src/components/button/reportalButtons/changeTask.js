const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const dbId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const conn = require("../../../sqlConnection.js");

module.exports = {
  data: {
    name: `reportalChangeTask`,
  },
  async execute(interaction, client) {
    try {
      await interaction.deferUpdate();

      if (interaction.user.id !== interaction.message.interaction.user.id) {
        await interaction.followUp({
          content: "You cannot use this button.",
          ephemeral: true,
        });
        return;
      }

      const member = interaction.guild.members.cache.get(interaction.user.id);
      const message = await interaction.message.channel.messages.fetch(
        interaction.message.id
      );

      const messageEmbed = interaction.message.embeds[0];

      const mgmt_connection = await conn.managementConnection();
      try {
        const currentTime = Date.now();

        const getCurrentReportal =
          "SELECT * FROM Executive_Reportals WHERE EXECUTIVE_ID = ? AND TIME_OUT_UNIX IS NULL";
        const [currentReportal] = await mgmt_connection.query(
          getCurrentReportal,
          [member.user.id]
        );

        if (currentReportal.length > 0) {
          const taskIdField = messageEmbed.fields.find(
            (f) => f.name === "Task ID"
          );
          if (currentReportal[0].TASK_ID === taskIdField.value) {
            await interaction.followUp({
              content: `🔴 ERROR: The selected task is already ongoing. Please switch into a different task.`,
              ephemeral: true,
            });
          }
          return;
        }

        return;

        const timeInMoment = moment.unix(currentTime / 1000).tz("Asia/Manila");

        const formattedTimestamp = timeInMoment.format("MMM D, YYYY h:mm A");
        const nextPenaltyTimestamp = timeInMoment
          .clone()
          .add(30, "minutes")
          .format("MMM D, YYYY h:mm A");

        const taskName = messageEmbed.fields.find(
          (f) => f.name === "Current Selected Task"
        ).value;
        const taskId = messageEmbed.fields.find(
          (f) => f.name === "Task ID"
        ).value;

        const threadEmbed = new EmbedBuilder()
          .setTitle(`🟢 LOG IN`)
          .setDescription(
            `👤 **User:** ${member.nickname}\n⏱️ **Time In:** ${formattedTimestamp}\n⏱️ **Penalty Time:** ${nextPenaltyTimestamp}`
          )
          .addFields([
            {
              name: "Current Task",
              value: taskName,
            },
          ])
          .setColor("Green");

        const thread = await interaction.channel.threads.create({
          name: `${nanoid()} | ${member.nickname} - ${taskName}`,
          autoArchiveDuration: 1440,
        });
        await thread.join();
        await thread.members.add(interaction.user.id);

        const newChannelName = interaction.channel.name.replace("🔴", "🟢");

        await interaction.channel.setName(newChannelName);

        await message.delete();

        const embed = new EmbedBuilder()
          .setDescription(
            `### New Reportal Thread Created!\nYou can send your reportals to this thread channel: <#${thread.id}>`
          )
          .setColor("#2B2D31");

        await thread.send({
          embeds: [threadEmbed],
        });

        await interaction.followUp({
          embeds: [embed],
          ephemeral: true,
        });

        const insertReportal =
          "INSERT INTO Executive_Reportals (ID, EXECUTIVE_ID, EXECUTIVE_NAME, TIME_IN_UNIX, TASK_ID, TASK_NAME, DISCORD_THREAD_ID) VALUES (?, ?, ?, ?, ?, ?, ?)";
        await mgmt_connection.query(insertReportal, [
          dbId(),
          member.user.id,
          member.nickname,
          currentTime,
          taskId,
          taskName,
          thread.id,
        ]);

        await client.events
          .get("reportal")
          .execute(interaction, thread.id, client, 0);
      } finally {
        await mgmt_connection.end();
      }
    } catch (error) {
      console.log(error.stack);
      await interaction.followUp({
        content: `🔴 ERROR: ${error.message}.`,
        ephemeral: true,
      });
    }
  },
};

function pauseThread() {}

async function endCurrentTask(interaction, client, reportal) {
  const timeOut = Date.now();
  const workId = reportal[0].ID;
  const taskId = reportal[0].TASK_ID;
  const timeIn = reportal[0].TIME_IN_UNIX;

  const timeOutStamp = moment
    .unix(timeOut / 1000)
    .tz("Asia/Manila")
    .format("MMM DD, YYYY hh:mm A");
  const timeInStamp = moment
    .unix(timeIn / 1000)
    .tz("Asia/Manila")
    .format("MMM DD, YYYY hh:mm A");

  const duration = timeOut - timeIn;
}
