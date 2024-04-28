const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ncr")
    .setDescription("Write a Non-Conformance Report for an executive."),

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

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder().setCustomId("ncrModal");

      modal.setTitle(`Non-Conformance Report`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`titleInput`)
        .setLabel(`Title`)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(1000)
        .setPlaceholder("The title of your NCR")
        .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`detailsInput`)
        .setLabel(`Deficiency Details`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("The details of your NCR.")
        .setMaxLength(1000)
        .setRequired(true);

      const thirdInput = new TextInputBuilder()
        .setCustomId(`impactInput`)
        .setLabel(`Impact`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("The impact of the problem.")
        .setMaxLength(1000)
        .setRequired(true);

      const fourthInput = new TextInputBuilder()
        .setCustomId(`correctiveAction`)
        .setLabel(`Corrective Action`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Details for the action that needs to be taken.")
        .setMaxLength(1000)
        .setRequired(true);

      const fifthInput = new TextInputBuilder()
        .setCustomId(`preventiveAction`)
        .setLabel(`Preventive Action`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Details to prevent future related problems.")
        .setMaxLength(1000)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
      const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);
      const fifthActionRow = new ActionRowBuilder().addComponents(fifthInput);

      modal.addComponents(
        firstActionRow,
        secondActionRow,
        thirdActionRow,
        fourthActionRow,
        fifthActionRow
      );

      return modal;
    }
  },
};
