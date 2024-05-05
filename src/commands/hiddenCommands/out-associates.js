const { EmbedBuilder } = require("discord.js");
const conn = require("../../sqlConnection");

module.exports = {
  name: "out-associates",
  async execute(interaction, client) {
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

    await interaction.deferReply();

    const member = interaction.guild.members.cache.get(interaction.user.id);

    if (!member.roles.cache.has("1197888181702496319")) {
      await interaction.editReply({
        content: `🔴 ERROR: Only <@&1197888181702496319> can use this command.`,
        ephemeral: true,
      });
      return;
    }

    const connection = await conn.managementConnection();

    const userId = interaction.user.id;
    const timeOut = Date.now();

    const timeStamp = new Date(timeOut).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    await client.commands
      .get("reportal")
      .execute(interaction, thread.id, client, 1);

    const queryWorkShiftString =
      "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
    const workShift = await connection
      .query(queryWorkShiftString, [userId])
      .catch((err) => console.log(err));

    if (workShift[0].length <= 0) {
      await interaction.editReply({
        content: `🔴 ERROR: No work log in found.`,
      });
      await connection.end();
      return;
    }

    const workId = workShift[0][0].ID;
    const timeIn = workShift[0][0].TIME_IN;

    const timeInStamp = new Date(timeIn).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    try {
      const duration = timeOut - timeIn;
      const { hours, minutes } = convertMilliseconds(duration);
      const minutesOnly = Math.floor(duration / 60000);
      ///
      let updateQuery;
      if (interaction.member.roles.cache.has("1185935514042388520")) {
        updateQuery =
          "UPDATE Executives SET TIME_RENDERED = (TIME_RENDERED + ?) WHERE MEMBER_ID = ?";
      } else {
        updateQuery =
          "UPDATE Sub_Members SET TIME_RENDERED = (TIME_RENDERED + ?) WHERE MEMBER_ID = ?";
      }

      const updateWorkShiftString =
        "UPDATE WORK_HOURS SET TIME_OUT = ? WHERE ID = ?";
      await connection
        .query(updateWorkShiftString, [timeOut, workId])
        .catch((err) => console.log(err));

      await connection
        .query(updateQuery, [minutesOnly, userId])
        .catch((err) => console.log(err));

      const embed = new EmbedBuilder()
        .setTitle(`🔴 LOG OUT`)
        .setDescription(
          `👤 **User:** ${member.nickname}\n⏱️ **Time In:** ${timeInStamp}\n⏱️ **Time Out:** ${timeStamp}\n⏳ **Duration:** ${hours} hours and ${minutes} minutes`
        )
        .setColor("Red")
        // .setTimestamp(timeStamp)
        .setFooter({
          iconURL: interaction.user.displayAvatarURL(),
          text: "Leviosa Philippines",
        });

      await interaction.editReply({
        embeds: [embed],
      });

      await thread.members.remove(interaction.user.id);
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
      await interaction.editReply({
        content:
          "There was an error while recording your work time, please try again.",
        ephemeral: true,
      });
    } finally {
      await connection.end();
    }

    function convertMilliseconds(milliseconds) {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return { hours, minutes };
    }
  },
};
