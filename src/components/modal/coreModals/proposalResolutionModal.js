const pool = require("../../../sqlConnectionPool");

module.exports = {
  data: {
    name: `proposalResolutionModal`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const resolution = interaction.fields.getTextInputValue("resolutionInput");
    const member = interaction.guild.members.cache.get(interaction.user.id);

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const updateQuery = `UPDATE Leviosa_Proposals SET RESOLUTION = ? WHERE MESSAGE_ID = ?`;
    await connection.execute(updateQuery, [resolution, interaction.message.id]);

    await connection.release();

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    let messageEmbed = interaction.message.embeds[0];
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
      .get("1186661471451627661")
      .send({
        embeds: [messageEmbed],
        components: [],
      })
      .then(() => {
        message.delete();
      });
  },
};
