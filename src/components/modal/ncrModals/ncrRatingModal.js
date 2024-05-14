const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
// const conn = require("../../../sqlConnection.js");
const pools = require("../../../sqlPools.js");

module.exports = {
  data: {
    name: "ncrRatingModal",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const messagePayload = {};
    try {
      const rating = interaction.fields.getTextInputValue("rateInput");
      const details = interaction.fields.getTextInputValue("detailsInput");
      const parsedRating = Number(rating);

      if (isNaN(parsedRating)) {
        throw new Error("Rating must be a number.");
      }

      const channel = interaction.channel;
      const message = await interaction.message.channel.messages.fetch(
        interaction.message.id
      );

      const interactionMember = await interaction.guild.members.cache.get(
        interaction.user.id
      );
      const executive = message.mentions.users.first();

      // const mgmt_connection = await conn.managementConnection();
      const mgmt_connection = await pools.managementPool.getConnection();
      try {
        const messageEmbed = interaction.message.embeds[0].data;

        messageEmbed.fields.push({ name: "\u200b\nRating", value: rating });
        if (details.length > 0) {
          messageEmbed.fields.push({ name: "Rating Details", value: details });
        }
        messageEmbed.footer.text = `This NCR was rated by ${interactionMember.nickname}`;
        messageEmbed.color = 5763719; //Green

        messagePayload.embeds = [messageEmbed];
        messagePayload.components = [];

        const updateQuery = `UPDATE Executives SET TIME_DEDUCTION = (TIME_DEDUCTION + ?) WHERE MEMBER_ID = ?`;
        const [update] = await mgmt_connection.query(updateQuery, [
          parsedRating,
          executive.id,
        ]);

        if (update.changedRows < 0) {
          throw new Error(
            "There was a problem while updating the time deduction for this executive, please contact the head of TDD."
          );
        }

        await interaction.editReply(messagePayload);
      } finally {
        // await mgmt_connection.end();
        mgmt_connection.release();
      }
    } catch (error) {
      console.log(error.stack);
      messagePayload.content = `🔴 ERROR: ${error.message}`;
      messagePayload.ephemeral = true;
      await interaction.followUp(messagePayload);
    }
  },
};
