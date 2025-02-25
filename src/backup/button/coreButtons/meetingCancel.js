module.exports = {
  data: {
    name: `cancelMeeting`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0].data;
    messageEmbed.description = `## Meeting Cancelled\nThis meeting is invalidated.`;

    messageEmbed.color = 15548997;

    await interaction.editReply({
      content: "",
      embeds: [messageEmbed],
      components: [],
    });
  },
};
