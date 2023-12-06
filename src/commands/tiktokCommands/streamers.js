const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  // cooldown: 90,
  data: new SlashCommandBuilder()
    .setName("streamers")
    .setDescription("Show all of the streamers' dashboard."),
  async execute(interaction, client, type) {
    const validRoles = ["1177271188997804123"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this command.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

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
