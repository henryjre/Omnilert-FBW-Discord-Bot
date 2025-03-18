const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Prepare an announcement."),

  async execute(interaction, client) {
    const validRoles = ["1314413671245676685"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      const replyEmbed = new EmbedBuilder().setDescription(
        `🔴 ERROR: This command can only be used by <@&1314413671245676685>.`
      );
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [replyEmbed],
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder().setCustomId("announcementModal");

      modal.setTitle(`Make an announcement`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`titleInput`)
        .setLabel(`Title`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("The title of your announcement")
        .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`announcementInput`)
        .setLabel(`Announcement Details`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("The details of your announcement.")
        .setMaxLength(4000)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

      modal.addComponents(firstActionRow, secondActionRow);

      return modal;
    }
  },
};
