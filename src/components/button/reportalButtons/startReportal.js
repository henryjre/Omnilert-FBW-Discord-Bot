const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const dbId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const conn = require("../../../sqlConnection.js");

module.exports = {
  data: {
    name: `reportalStart`,
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

      const mgmt_connection = await conn.managementConnection();
      const member = interaction.guild.members.cache.get(interaction.user.id);
      const message = await interaction.message.channel.messages.fetch(
        interaction.message.id
      );

      const messageEmbed = interaction.message.embeds[0];

      try {
        const timeIn = Date.now();

        const getCurrentReportal =
          "SELECT * FROM Executive_Reportals WHERE EXECUTIVE_ID = ? AND TIME_OUT_UNIX IS NULL";
        const [currentReportal] = await mgmt_connection.query(
          getCurrentReportal,
          [member.user.id]
        );

        if (currentReportal.length > 0) {
          await interaction.followUp({
            content: `🔴 ERROR: You currently have a running shift. Please use /out to log out before logging in.`,
            ephemeral: true,
          });
          return;
        }

        const timeInMoment = moment.unix(timeIn / 1000).tz("Asia/Manila");

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
          timeIn,
          taskId,
          taskName,
          thread.id,
        ]);

        await client.events
          .get("reportal")
          .execute(interaction, thread.id, client, 0);
      } finally {
        mgmt_connection.destroy();
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
