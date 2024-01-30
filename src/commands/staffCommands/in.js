const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);
const moment = require("moment");
const threadId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5);

const pool = require("../../sqlConnectionPool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("in")
    .setDescription("Log in to start work shift."),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.guild.members.cache.get(interaction.user.id);

    const id = nanoid();

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const userId = interaction.user.id;
    const timeIn = Date.now();

    const queryIn =
      "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
    const workShift = await connection
      .query(queryIn, [userId])
      .catch((err) => console.log(err));

    if (workShift[0].length > 0) {
      await interaction.editReply({
        content: `🔴 ERROR: You currently have a running shift. Please use /out to log out before logging in.`,
        ephemeral: true,
      });
      connection.release();
      return;
    }

    const thread = await interaction.channel.threads.create({
      name: `${member.nickname} | ${threadId()}`,
      reason: `Reportal ID: ${id}`,
      autoArchiveDuration: 1440,
    });
    await thread.join();
    await thread.members.add(interaction.user.id);

    const timeOpts = {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };

    const timeStamp = new Date(timeIn).toLocaleDateString("en-PH", timeOpts);

    const nextPenalty = new Date(timeIn + 30 * 60000).toLocaleDateString(
      "en-PH",
      timeOpts
    );

    const queryWorkShiftString =
      "INSERT INTO WORK_HOURS (ID, DISCORD_ID, TIME_IN) VALUES (?, ?, ?)";
    await connection
      .query(queryWorkShiftString, [id, userId, timeIn])
      .catch((err) => console.log(err));

    await connection.release();

    const threadEmbed = new EmbedBuilder()
      .setTitle(`🟢 LOG IN`)
      .setDescription(
        `👤 **User:** ${member.nickname}\n⏱️ **Time In:** ${timeStamp}\n⏱️ **Penalty Time:** ${nextPenalty}`
      )
      .setColor("Green")
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: "Leviosa Philippines",
      });

    const embed = new EmbedBuilder()
      .setDescription(
        `### New Reportal Thread Created!\nYou can send your reportals to this thread channel: <#${thread.id}>`
      )
      .setColor("#2B2D31");

    await thread.send({
      embeds: [threadEmbed],
    });

    await interaction.editReply({
      embeds: [embed],
      ephemeral: true,
    });

    await interaction.channel.setName(
      interaction.channel.name.replace("🔴", "🟢")
    );

    await client.commands
      .get("reportal")
      .execute(interaction, thread.id, client, 0);
  },
};
