const { captureMessageDeleted, safelyCapture } = require('../../utils/discordActivity');

module.exports = {
  name: "messageDelete",
  async execute(message, client) {
    safelyCapture('message deleted', () => captureMessageDeleted(message));
    if (message.partial) return;
    if (message.author?.bot) return;

    const thread = message.guild?.channels.cache.find(
      (channel) => channel.isThread() && channel.id === message.channel.id
    );
    if (!thread) return;

    if (thread.name.includes("Portal Announcement Upload -")) {
      return await client.events
        .get("portalAnnouncementAttachmentDelete")
        .execute(message, thread, client);
    }
  },
};
