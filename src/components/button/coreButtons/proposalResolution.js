const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `proposalResolution`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has("1177271188997804123")) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder()
        .setCustomId("proposalResolutionModal")
        .setTitle(`Resolve this proposal`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`resolutionInput`)
        .setLabel(`Resolution`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("The conclusion of the proposal")
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

      modal.addComponents(firstActionRow);

      return modal;
    }
  },
};
