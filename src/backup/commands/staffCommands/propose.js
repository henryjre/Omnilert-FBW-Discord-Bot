const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("propose")
    .setDescription("Propose a new idea/system to Leviosa.")
    .addAttachmentOption((option) =>
      option
        .setName("proposal")
        .setDescription("The PDF file of the proposal.")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const proposalFile = interaction.options.getAttachment("proposal");

    if (proposalFile.contentType !== "application/pdf") {
      interaction.reply({
        content: `🔴 ERROR: The proposal attachment should be a PDF file.`,
        ephemeral: true,
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder();

      modal.setCustomId("proposal").setTitle(`CREATE NEW PROPOSAL`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`titleInput`)
        .setLabel(`Title`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("The title of your proposal")
        .setMaxLength(100)
        .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`proposalNumber`)
        .setLabel(`Proposal Number`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("The sequence number of the proposal. E.G. 2024-0001")
        .setMaxLength(100)
        .setRequired(true);

      const thirdInput = new TextInputBuilder()
        .setCustomId(`proposalLink`)
        .setLabel(`Proposal Document (DO NOT CHANGE)`)
        .setStyle(TextInputStyle.Short)
        .setValue(proposalFile.url)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      return modal;
    }
  },
};
