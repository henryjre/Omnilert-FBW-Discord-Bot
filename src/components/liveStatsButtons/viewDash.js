const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `viewDash`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== interaction.message.interaction.user.id) {
      await interaction.reply({
        content: "You cannot use this button.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const claimedEmbed = new EmbedBuilder()
      .setTitle(`RETRIEVING DASHBOARD`)
      .setColor("#e8fbd4")
      .setDescription("⌛ Retrieving your dashboard... Please wait.");

    await interaction.editReply({
      embeds: [claimedEmbed],
      components: [],
    });

    return client.commands
      .get("livestreamDashboard")
      .execute(interaction, client);
  },
};
