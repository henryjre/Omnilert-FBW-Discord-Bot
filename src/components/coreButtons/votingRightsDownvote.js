const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `votingRightsDownvote`,
  },
  async execute(interaction, client) {
    if (interaction.user.id === "864920050691866654") {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (interactionMember.roles.cache.has("1186987728336846958")) {
      await interaction.reply({
        content: `You already voted, cannot vote again.`,
        ephemeral: true,
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder()
        .setCustomId("vrDownvoteModal")
        .setTitle(`Downvote`);

      // const firstInput = new TextInputBuilder()
      //   .setCustomId(`pbrInput`)
      //   .setLabel(`Performance Based Rate`)
      //   .setStyle(TextInputStyle.Short)
      //   .setPlaceholder("Rate the performance of the member between 1 to 50.")
      //   .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`remarksInput`)
        .setLabel(`Remarks`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Add remarks to justify your Downvote and PBR choice.")
        .setRequired(true);

      // const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

      modal.addComponents(secondActionRow);

      return modal;
    }
  },
};
