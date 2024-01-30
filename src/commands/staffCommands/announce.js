const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Announce something to Executives or BODs.")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The type of announcement to make.")
        .setRequired(true)
        .addChoices(
          { name: "🔴 Executive Announcement", value: "executive" },
          { name: "🟢 BOD Announcement", value: "bod" }
        )
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520", "1196806310524629062"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520> & <@&1196806310524629062>.`,
        ephemeral: true,
      });
      return;
    }

    const type = interaction.options.getString("type");

    const modal = buildModal(type);
    await interaction.showModal(modal);

    function buildModal(type) {
      const modal = new ModalBuilder().setCustomId("announcementModal");

      const channelInput = new TextInputBuilder()
        .setCustomId(`channelInput`)
        .setLabel(`Type (DO NOT CHANGE)`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      if (type === "executive") {
        channelInput.setValue("1197101506638381188");
        modal.setTitle(`Announce to the Executives`);
      } else {
        channelInput.setValue("1197101565421568082");
        modal.setTitle(`Announce to the Board of Directors`);
      }

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

      const channelRow = new ActionRowBuilder().addComponents(channelInput);
      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

      modal.addComponents(firstActionRow, secondActionRow, channelRow);

      return modal;
    }
  },
};
