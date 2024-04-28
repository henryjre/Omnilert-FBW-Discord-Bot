const { TextInputBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { ModalBuilder, TextInputStyle } = require("discord.js");

module.exports = {
  data: {
    name: `ncrRate`,
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
      const modal = new ModalBuilder().setCustomId("ncrRatingModal");

      modal.setTitle(`Rate this NCR`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`rateInput`)
        .setLabel(`Rating`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Input the rating in number format.")
        .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`detailsInput`)
        .setLabel(`Additional Details`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("(OPTIONAL) Add more details to explain your rating.")
        .setMaxLength(1000)
        .setRequired(false);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

      modal.addComponents(firstActionRow, secondActionRow);

      return modal;
    }
  },
};
