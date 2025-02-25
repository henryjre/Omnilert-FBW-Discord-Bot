const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `announcementCancel`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];
    if (!messageEmbed.data.fields[0].value.includes(interaction.user.id)) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();
    const cancelEmbed = new EmbedBuilder()
      .setTitle("Command Cancelled")
      .setDescription("You have cancelled the announcement.")
      .setColor("Red");

    await interaction.editReply({
      embeds: [cancelEmbed],
      components: [],
    });
  },
};
