const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `votingRightsAbstain`,
  },
  async execute(interaction, client) {
    if (interaction.user.id === "864920050691866654") {
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
        .setCustomId("vrAbstainModal")
        .setTitle(`Abstain`);

      const secondInput = new TextInputBuilder()
        .setCustomId(`remarksInput`)
        .setLabel(`Remarks`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Add remarks to justify your Abstain vote.")
        .setRequired(true);

      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

      modal.addComponents(secondActionRow);

      return modal;
    }
  },
};
