const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("View your livestream dashboard."),
  async execute(interaction, client) {
    const validRoles = ["1117440696891220050"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1117440696891220050>.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    return client.commands
      .get("livestreamDashboard")
      .execute(interaction, client);
  },
};
