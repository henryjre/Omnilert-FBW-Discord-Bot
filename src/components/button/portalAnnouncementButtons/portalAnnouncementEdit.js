const {
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const {
  parsePortalPreviewMessage,
  PORTAL_MESSAGE_LIMIT,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementEdit',
  },
  async execute(interaction, client) {
    const parsed = parsePortalPreviewMessage(interaction.message);

    if (parsed.ownerId !== interaction.user.id) {
      const replyEmbed = new EmbedBuilder()
        .setDescription('🔴 ERROR: You cannot use this button.')
        .setColor('Red');

      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [replyEmbed],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('portalAnnouncementEditModal')
      .setTitle('Edit portal announcement');

    const announcementInput = new TextInputBuilder()
      .setCustomId('announcementInput')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(parsed.announcement)
      .setValue(parsed.announcement)
      .setMaxLength(PORTAL_MESSAGE_LIMIT)
      .setRequired(true);

    const announcementLabel = new LabelBuilder()
      .setLabel('Announcement')
      .setDescription('The announcement to send in the portal announcement channel')
      .setTextInputComponent(announcementInput);

    modal.addLabelComponents(announcementLabel);

    return interaction.showModal(modal);
  },
};
