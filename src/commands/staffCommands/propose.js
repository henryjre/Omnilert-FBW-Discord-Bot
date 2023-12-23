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
    .setDescription("Propose a new idea to the system of Leviosa.")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Submit privately or publicly.")
        .setRequired(true)
        .addChoices(
          { name: "🔓 Submit public proposal", value: "public" },
          { name: "🔒 Submit private proposal", value: "private" }
        )
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    const type = interaction.options.getString("type");

    const modal = buildModal(type);
    await interaction.showModal(modal);

    function buildModal(type) {
      const modal = new ModalBuilder();

      if (type === "public") {
        modal
          .setCustomId("coreProposalPublic")
          .setTitle(`Propose an idea PUBLICLY`);
      } else {
        modal
          .setCustomId("coreProposalPrivate")
          .setTitle(`Propose an idea PRIVATELY`);
      }

      const firstInput = new TextInputBuilder()
        .setCustomId(`titleInput`)
        .setLabel(`Title`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("The title of your proposal")
        .setMaxLength(100)
        .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`issueInput`)
        .setLabel(`Statement of the Problem`)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setPlaceholder("The issue you want to address")
        .setRequired(true);

      const thirdInput = new TextInputBuilder()
        .setCustomId(`abstractInput`)
        .setLabel(`Proposed Solution`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("The abstract/content of your proposal.")
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      return modal;
    }
  },
};
