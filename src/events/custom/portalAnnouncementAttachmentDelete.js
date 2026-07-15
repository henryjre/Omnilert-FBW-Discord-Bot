const { rebuildPortalPreviewFromMessage } = require('../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  name: 'portalAnnouncementAttachmentDelete',
  async execute(message, thread, client) {
    if (message.partial) return;
    if (message.attachments.size <= 0) return;

    const originalMessage = await thread.fetchStarterMessage();
    if (!originalMessage) return;

    try {
      await rebuildPortalPreviewFromMessage(originalMessage);
    } catch (err) {
      console.error('[portalAnnouncementAttachmentDelete] Error:', err);
    }
  },
};
