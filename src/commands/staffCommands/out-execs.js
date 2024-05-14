const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const conn = require("../../sqlConnection");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("out")
    .setDescription("Log out of your current reportal.")
    .addSubcommand((subcommand) =>
      subcommand.setName("executives").setDescription("Log out for Executives.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("associates").setDescription("Log out for Associates.")
    ),
  async execute(interaction, client) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "associates") {
        await client.commands
          .get("out-associates")
          .execute(interaction, client);
        return;
      }

      await interaction.deferReply();
      const member = interaction.guild.members.cache.get(interaction.user.id);

      if (!member.roles.cache.has("1185935514042388520")) {
        throw new Error("Only <@&1185935514042388520> can use this command.");
      }

      const thread = await interaction.channel;
      const parentChannel = await client.channels.cache.get(thread.parentId);
      if (!thread.isThread()) {
        await interaction.reply({
          content:
            "Cannot find the channel. Please log out on your reportal thread channel.",
          ephemeral: true,
        });
        return;
      }

      const userId = member.user.id;
      const timeOut = Date.now();

      const mgmt_connection = await conn.managementConnection();

      try {
        const timeOutStamp = moment
          .unix(timeOut / 1000)
          .tz("Asia/Manila")
          .format("MMM DD, YYYY hh:mm A");

        const queryReportal =
          "SELECT * FROM Executive_Reportals WHERE EXECUTIVE_ID = ? AND TIME_OUT_UNIX IS NULL";
        const [reportal] = await mgmt_connection.query(queryReportal, [userId]);

        if (reportal.length <= 0) {
          await client.events
            .get("reportal")
            .execute(interaction, thread.id, client, 1);

          await interaction.editReply({
            content: `No ongoing reportals.`,
          });
          return;
        }

        if (reportal[0].DISCORD_THREAD_ID !== thread.id) {
          return await interaction.editReply({
            content: `You cannot log out from this thread channel. Please go to <#${reportal[0].DISCORD_THREAD_ID}>`,
          });
        }

        await client.events
          .get("reportal")
          .execute(interaction, thread.id, client, 1);

        const workId = reportal[0].ID;
        const taskId = reportal[0].TASK_ID;
        const timeIn = reportal[0].TIME_IN_UNIX;

        const timeInStamp = moment
          .unix(timeIn / 1000)
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
          await mgmt_connection.query(updateWorkShiftString, [timeOut, workId]);

          const updateTasks =
            "UPDATE Executive_Tasks SET TIME_RENDERED = (TIME_RENDERED + ?) WHERE TASK_ID = ?";
          await mgmt_connection.query(updateTasks, [minutesOnly, taskId]);

          await mgmt_connection.commit();
          console.log(
            `Reportal transaction committed successfully by ${member.nickname}.`
          );
        } catch (error) {
          await mgmt_connection.rollback();
          console.error(
            `Reportal transaction rolled back due to error by ${member.nickname}:`,
            error
          );
        }

        const embed = new EmbedBuilder()
          .setTitle(`🔴 LOG OUT`)
          .setDescription(
            `👤 **User:** ${member.nickname}\n⏱️ **Time In:** ${timeInStamp}\n⏱️ **Time Out:** ${timeOutStamp}\n⏳ **Duration:** ${hours} hours and ${minutes} minutes`
          )
          .setColor("Red");

        await interaction.editReply({
          embeds: [embed],
        });

        await thread.members.remove(member.user.id);

        const threadCreatedMessages = await parentChannel.messages
          .fetch()
          .then((messages) => {
            return messages.filter((m) => m.author.bot && m.type === 18);
          });

        const lastThreadCreated = await threadCreatedMessages.find(
          (t) => t.reference.channelId === thread.id
        );

        await lastThreadCreated.delete();

        await thread.setLocked(true);
        await thread.setArchived(true);

        // const channelThreads = parentChannel.threads;
        // const activeThreads = await channelThreads.fetchActive();

        // if (activeThreads.threads.size <= 0) {
        //   await parentChannel.setName(parentChannel.name.replace("🟢", "🔴"));
        // }
      } finally {
        await mgmt_connection.end();
      }
    } catch (error) {
      console.log(error.stack);
      await interaction.editReply({
        content: `🔴 ERROR: ${error.message}.`,
      });
    }

    function convertMilliseconds(milliseconds) {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return { hours, minutes };
    }
  },
};
