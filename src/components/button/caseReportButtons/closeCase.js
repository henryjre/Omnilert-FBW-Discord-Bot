const {
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `closeCaseButton`,
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

    let messageEmbed = interaction.message.embeds[0];
    const correctiveActionField = messageEmbed.data.fields[3];
    const resolutionField = messageEmbed.data.fields[4];

    if (correctiveActionField.value === "To be added") {
      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `🔴 ERROR: You cannot close a case without adding an **immediate corrective action**.`
        )
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (resolutionField.value === "To be added") {
      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `🔴 ERROR: You cannot close a case without adding a **resolution**.`
        )
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = buildEditModal();
    await interaction.showModal(modal);

    function buildEditModal() {
      const modal = new ModalBuilder()
        .setCustomId("closeCaseConfirmation")
        .setTitle(`CONFIRMATION`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`closeCaseInput`)
        .setLabel(`Type the CASE NUMBER to close this case.`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`EXAMPLE: Case 0001 / CASE 0001 / case 0001`)
        .setMaxLength(100)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

      modal.addComponents(firstActionRow);

      return modal;
    }

    return;
  },
};
