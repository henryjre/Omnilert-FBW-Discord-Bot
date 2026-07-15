const {
  buildPortalPreviewPayload,
  collectPortalThreadAttachments,
  findPortalAttachmentThread,
  parsePortalPreviewMessage,
  PORTAL_MESSAGE_LIMIT,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementEditModal',
  },
  async execute(interaction, client) {
    const announcement = interaction.fields
      .getTextInputValue('announcementInput')
      .slice(0, PORTAL_MESSAGE_LIMIT);
    const parsed = parsePortalPreviewMessage(interaction.message);
    const thread = findPortalAttachmentThread(interaction.message.channel, interaction.message.id);
    const attachments = await collectPortalThreadAttachments(thread);

    await interaction.deferUpdate();

    await interaction.message.edit(
      buildPortalPreviewPayload({
        announcement,
        ownerId: parsed.ownerId,
        selectedRecipients: parsed.selectedRecipients,
        attachments,
      })
    );
  },
};
