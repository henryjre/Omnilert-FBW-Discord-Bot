const { EmbedBuilder } = require("discord.js");
// const conn = require("../../sqlConnection");
const pools = require("../../sqlPools.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  name: "add-liab",
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

    const liabAmount = interaction.options.getNumber("amount");
    const streamer = interaction.options.getUser("livestreamer");
    const streamerId = streamer.id;

    const streamerMember = interaction.guild.members.cache.get(streamerId);

    if (!streamerMember.roles.cache.has("1117440696891220050")) {
      await interaction.reply({
        content: `🔴 ERROR: ${streamer.toString()} is not a <@&1117440696891220050>.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    // const connection = await conn.managementConnection();
    const connection = await pools.managementPool.getConnection();

    try {
      const updateLiabQuery =
        "UPDATE Tiktok_Livestreamers SET LIABILITIES = (LIABILITIES + ?) WHERE STREAMER_ID = ?";
      const update = await connection.query(updateLiabQuery, [
        liabAmount,
        streamerId,
      ]);

      let embed;
      if (update[0].affectedRows) {
        embed = new EmbedBuilder()
          .setTitle(`ADD LIABILITY SUCCESS`)
          .setColor("Green")
          .setDescription(`🟢 Liabilities were added.`)
          .addFields([
            {
              name: "LIVESTREAMER",
              value: streamer.toString(),
            },
            {
              name: "LIABILITY AMOUNT",
              value: pesoFormatter.format(liabAmount),
            },
          ])
          .setFooter({
            text: `ADDED BY: ${interaction.user.globalName}`,
          })
          .setTimestamp(Date.now());
      } else {
        embed = new EmbedBuilder()
          .setTitle(`ADD LIABILITY ERROR`)
          .setColor("Yellow")
          .setDescription(
            `🟡 Liabilities were not added to the user mentioned.`
          )
          .addFields([
            {
              name: "LIVESTREAMER",
              value: streamer.toString(),
            },
            {
              name: "LIABILITY AMOUNT",
              value: pesoFormatter.format(liabAmount),
            },
          ])
          .setFooter({
            text: `COMMAND BY: ${interaction.user.globalName}`,
          })
          .setTimestamp(Date.now());
      }

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`ADD LIABILITIES ERROR`)
        .setColor("Red")
        .setDescription(`🔴 There was an error while adding liabilities.`)
        .addFields([
          {
            name: "LIVESTREAMER",
            value: streamer.toString(),
          },
          {
            name: "LIABILITY AMOUNT",
            value: pesoFormatter.format(liabAmount),
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
      // await connection.end();
      connection.release();
    }
  },
};
