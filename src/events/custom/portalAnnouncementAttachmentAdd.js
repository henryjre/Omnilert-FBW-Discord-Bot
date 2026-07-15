const { MessageFlags } = require('discord.js');
const {
  parsePortalPreviewMessage,
  rebuildPortalPreviewFromMessage,
} = require('../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  name: 'portalAnnouncementAttachmentAdd',
  async execute(message, thread, client) {
    if (message.attachments.size <= 0) return;

    const originalMessage = await thread.fetchStarterMessage();
    if (!originalMessage) return;

    const parsed = parsePortalPreviewMessage(originalMessage);
    if (parsed.ownerId !== message.author.id) return;

    const loaderMessage = await message.reply({
      content: 'Adding attachment/s to preview...',
      flags: MessageFlags.Ephemeral,
    });

    try {
      await rebuildPortalPreviewFromMessage(originalMessage);
      await loaderMessage.edit({ content: '✅ Attachment/s added to preview.' });
    } catch (err) {
      console.error('[portalAnnouncementAttachmentAdd] Error:', err);
      await loaderMessage.edit({ content: '❌ Failed to add attachment/s to preview.' });
    }

    setTimeout(() => loaderMessage.delete().catch(() => {}), 5000);
  },
};
