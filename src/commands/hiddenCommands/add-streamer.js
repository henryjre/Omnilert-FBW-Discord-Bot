const { EmbedBuilder } = require("discord.js");
const conn = require("../../sqlConnection");

module.exports = {
  name: "add-streamer",
  async execute(interaction, client) {
    const validRoles = ["1176496361802301462"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1176496361802301462>.`,
        ephemeral: true,
      });
      return;
    }

    const streamer = interaction.options.getUser("user");
    const streamerId = streamer.id;

    const streamerMember = interaction.guild.members.cache.get(streamerId);

    if (streamerMember.roles.cache.has("1117440696891220050")) {
      await interaction.reply({
        content: `🔴 ERROR: ${streamer.toString()} is already a <@&1117440696891220050>.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const connection = await conn.managementConnection();

    try {
      const insertQuery1 = `INSERT INTO Tiktok_Livestreamers (STREAMER_ID, BALANCE, LIABILITIES, WITHDRAWALS) VALUES (?, ?, ?)`;
      await connection
        .query(insertQuery1, [streamerId, 0, 0, 2])
        .catch((err) => console.log(err));

      streamerMember.roles.add("1117440696891220050");

      embed = new EmbedBuilder()
        .setTitle(`ADDED NEW TIKTOK LIVESTREAMER`)
        .setColor("Green")
        .addFields([
          {
            name: "LIVESTREAMER",
            value: streamer.toString(),
          },
        ])
        .setFooter({
          text: `ADDED BY: ${interaction.user.globalName}`,
        })
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`ADD LIVESTREAMER ERROR`)
        .setDescription("🔴 There was an error while adding the livestreamer.")
        .setColor("Red")
        .addFields([
          {
            name: "LIVESTREAMER",
            value: streamer.toString(),
          },
        ])
        .setFooter({
          text: `COMMAND BY: ${interaction.user.globalName}`,
        })
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
    } finally {
      await connection.destroy();
    }
  },
};
