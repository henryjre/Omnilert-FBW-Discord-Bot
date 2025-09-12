const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: `meetingCancel`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const authorField = messageEmbed.data.fields.find(
      (f) => f.name === "Created By"
    );

    if (!authorField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const cancelEmbed = new EmbedBuilder()
      .setDescription("You have cancelled the meeting creation.")
      .setColor("Red");

    await interaction.editReply({
      embeds: [cancelEmbed],
    });

    await interaction.message.delete();
  },
};
