const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const { managementPool } = require("../../sqlConnection");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("in")
    .setDescription("Log in to start work shift."),
  async execute(interaction, client) {
    await interaction.deferReply();

    const connection = await managementPool
      .getConnection()
      .catch((err) => console.log(err));

    const id = nanoid();
    const userId = interaction.user.id;
    const timeIn = Date.now();

    const member = interaction.guild.members.cache.get(userId);

    const queryIn =
      "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
    const workShift = await connection
      .query(queryIn, [userId])
      .catch((err) => console.log(err));

    if (workShift[0].length > 0) {
      await interaction.editReply({
        content: `🔴 ERROR: You currently have a running shift. Please use /out to log out before logging in.`,
      });
      connection.release();
      return;
    }

    client.commands.get("reminder").execute(interaction, client, 0);

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

    const nextPenalty = new Date(
      timeIn + (2 * 60 * 60 + 60) * 1000
    ).toLocaleDateString("en-PH", timeOpts);

    const queryWorkShiftString =
      "INSERT INTO WORK_HOURS (ID, DISCORD_ID, TIME_IN) VALUES (?, ?, ?)";
    await connection
      .query(queryWorkShiftString, [id, userId, timeIn])
      .catch((err) => console.log(err));

    connection.release();

    const embed = new EmbedBuilder()
      .setTitle(`🟢 LOG IN`)
      .setDescription(
        `👤 **User:** ${member.nickname}\n⏱️ **Time In:** ${timeStamp}\n⏱️ **Penalty Time:** ${nextPenalty}`
      )
      .setColor("Green")
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: "Leviosa Philippines",
      });

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
