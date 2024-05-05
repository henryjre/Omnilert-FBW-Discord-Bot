const { EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);
const threadId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5);

const conn = require("../../sqlConnection");

module.exports = {
  name: "in-associates",
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.guild.members.cache.get(interaction.user.id);

    if (!member.rolse.cache.has("1197888181702496319")) {
      await interaction.editReply({
        content: `🔴 ERROR: Only <@&1197888181702496319> can use this command.`,
        ephemeral: true,
      });
      return;
    }

    const id = nanoid();

    const connection = await conn.managementConnection();

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
      await connection.end();
      return;
    }

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

    const thread = await interaction.channel.threads.create({
      name: `${member.nickname} | ${threadId()}`,
      reason: `Reportal ID: ${id}`,
      autoArchiveDuration: 1440,
    });
    await thread.join();
    await thread.members.add(interaction.user.id);

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

    const queryWorkShiftString =
      "INSERT INTO WORK_HOURS (ID, DISCORD_ID, TIME_IN) VALUES (?, ?, ?)";
    await connection
      .query(queryWorkShiftString, [id, userId, timeIn])
      .catch((err) => console.log(err));

    await connection.end();

    await client.commands
      .get("reportal")
      .execute(interaction, thread.id, client, 0);

    await interaction.channel.setName(
      interaction.channel.name.replace("🔴", "🟢")
    );
  },
};
