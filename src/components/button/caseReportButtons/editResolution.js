const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: {
    name: `editResolutionButton`,
  },
  async execute(interaction, client) {
    const permissionRole = "1314413671245676685";

    if (!interaction.member.roles.cache.has(permissionRole)) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const messageEmbed = interaction.message.embeds[0];
    const resolutionField = messageEmbed.data.fields[4];

    let fieldValue = resolutionField.value;

    if (fieldValue === "To be added") {
      fieldValue = "";
    }

    const modal = buildEditModal();
    await interaction.showModal(modal);

    function buildEditModal() {
      const modal = new ModalBuilder()
        .setCustomId("editResolutionModal")
        .setTitle(`Edit the Resolution`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`resolutionInput`)
        .setLabel(`RESOLUTION`)
        .setStyle(TextInputStyle.Paragraph)
        .setValue(fieldValue)
        .setMaxLength(1000)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

      modal.addComponents(firstActionRow);

      return modal;
    }
  },
};
