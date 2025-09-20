const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: {
    name: `checkoutAddReason`,
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

    const messageEmbed = interaction.message.embeds[0];
    const checkoutReasonField = messageEmbed.fields.find(
      (field) => field.name === "Reason for Checkout"
    );

    let checkoutReasonInput = "";

    if (checkoutReasonField) {
      if (checkoutReasonField.value.includes("|")) {
        checkoutReasonInput = checkoutReasonField.value.split("|")[1].trim();
      } else {
        checkoutReasonInput = checkoutReasonField.value;
      }
    }

    const modal = new ModalBuilder()
      .setCustomId("checkoutReasonModal")
      .setTitle(`Add CheckoutReason`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`checkoutReasonInput`)
      .setLabel(`❓ Reason for Checkout`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setPlaceholder("Enter the reason.")
      .setValue(checkoutReasonInput)
      .setRequired(true);

    const secondInput = new TextInputBuilder()
      .setCustomId(`messageId`)
      .setLabel(`Message ID (DO NOT CHANGE)`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setValue(interaction.message.id)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

    modal.addComponents(firstActionRow, secondActionRow);
    await interaction.showModal(modal);
  },
};
