const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `allDashboardBackButton`,
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

    await interaction.guild.members.fetch();
    const streamers = interaction.guild.roles.cache
      .get("1117440696891220050")
      .members.map((m) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(m.user.globalName)
          .setValue(m.user.id)
      );

    const embed = new EmbedBuilder()
      .setDescription(
        `### View Streamers' Dashboard\nPlease select a streamer on the dropdown below.`
      )
      .setColor("#2B2D31");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("live-streamers")
      .setPlaceholder("Select streamer.")
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(streamers);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  },
};
