const { EmbedBuilder, MessageFlags } = require("discord.js");

const cdnChannelId = "1384688917155938354";

module.exports = {
  data: {
    name: `signatoriesCancel`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Prepared By"
    );

    if (!ownerField.value.includes(interaction.user.id)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
      });
    }

    const cancelEmbed = new EmbedBuilder()
      .setDescription("You have cancelled the signatories request.")
      .setColor("Red");

    await interaction.editReply({
      embeds: [cancelEmbed],
    });

    await interaction.message.delete();
  },
};
