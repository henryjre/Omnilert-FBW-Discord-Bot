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
  ANNOUNCEMENT_TITLE_LIMIT,
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
      .setTitle('Edit announcement');

    const titleInput = new TextInputBuilder()
      .setCustomId('titleInput')
      .setStyle(TextInputStyle.Short)
      .setValue(parsed.title)
      .setMaxLength(ANNOUNCEMENT_TITLE_LIMIT)
      .setRequired(true);

    const titleLabel = new LabelBuilder()
      .setLabel('Title')
      .setDescription('The title of your announcement')
      .setTextInputComponent(titleInput);

    const announcementInput = new TextInputBuilder()
      .setCustomId('announcementInput')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(parsed.announcement)
      .setMaxLength(PORTAL_MESSAGE_LIMIT)
      .setRequired(true);

    const announcementLabel = new LabelBuilder()
      .setLabel('Announcement')
      .setDescription('The details of your announcement')
      .setTextInputComponent(announcementInput);

    modal.addLabelComponents(titleLabel, announcementLabel);

    return interaction.showModal(modal);
  },
};
