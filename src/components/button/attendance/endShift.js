const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `attendanceEndShift`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has(managementRoleId)) {
      const mentionedUser =
        interaction.message.mentions?.users?.first() || null;
      const mentionedRole =
        interaction.message.mentions?.roles?.first() || null;

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
    }

    const modal = new ModalBuilder()
      .setCustomId("endShiftConfirmation")
      .setTitle("CONFIRMATION");

    const firstInput = new TextInputBuilder()
      .setCustomId("endShiftInput")
      .setLabel(`Confirm end of duty?.`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Type 'end' to confirm end of duty.")
      .setValue("end")
      .setMaxLength(3)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  },
};
