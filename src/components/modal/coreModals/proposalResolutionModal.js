// const conn = require("../../../sqlConnection");
// const pools = require("../../../sqlPools.js");

module.exports = {
  data: {
    name: `proposalResolutionModal`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const resolution = interaction.fields.getTextInputValue("resolutionInput");
    const member = interaction.guild.members.cache.get(interaction.user.id);

    let messageEmbed = interaction.message.embeds[0];

    let databaseTable, channelId;
    if (messageEmbed.data.title.includes("EXECUTIVE")) {
      databaseTable = "Executive_Proposals";
      channelId = "1204006923427516499";
    } else {
      databaseTable = "Directors_Proposals";
      channelId = "1186661471451627661";
    }

    // const connection = await conn.managementConnection();
    const connection = await pools.managementPool.getConnection();

    const updateQuery = `UPDATE ${databaseTable} SET RESOLUTION = ? WHERE MESSAGE_ID = ?`;
    await connection.query(updateQuery, [resolution, interaction.message.id]);

    // await connection.end();
    connection.release();

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    messageEmbed.data.fields.push({
      name: "Resolution",
      value: resolution,
    });
    messageEmbed.data.color = 13434624;
    messageEmbed.title = messageEmbed.title.replace(
      "LEVIOSA",
      "PUBLISHED LEVIOSA"
    );

    messageEmbed.footer = {
      text: `Published by: ${member.nickname}`,
    };

    await client.channels.cache
      .get(channelId)
      .send({
        embeds: [messageEmbed],
        components: [],
      })
      .then(() => {
        message.delete();
      });
  },
};
