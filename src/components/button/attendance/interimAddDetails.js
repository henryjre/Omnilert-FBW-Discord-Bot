const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: {
    name: `interimAddDetails`,
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(
        mentionedRole.id
      );
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId("attendanceInterimModal")
      .setTitle(`INTERIM DUTY FORM DETAILS`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`shiftCoverageInput`)
      .setLabel(`⏱️ Shift Coverage`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the shift coverage.")
      .setRequired(true);

    const secondInput = new TextInputBuilder()
      .setCustomId(`scopeOfWorkIput`)
      .setLabel(`🎯 Scope of Work`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the shift coverage.")
      .setRequired(true);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`assignedByInput`)
      .setLabel(`🤝 Assigned By`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter who assigned the duty.")
      .setRequired(true);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`messageId`)
      .setLabel(`Message ID (DO NOT CHANGE)`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setValue(interaction.message.id)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);

    modal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow,
      fourthActionRow
    );
    await interaction.showModal(modal);
  },
};
