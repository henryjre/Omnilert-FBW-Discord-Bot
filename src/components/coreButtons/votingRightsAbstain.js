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
        .setCustomId("vrAbstainModal")
        .setTitle(`Abstain`);

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
