module.exports = {
  name: "messageDelete",
  async execute(message, client) {
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

    if (thread.name.includes("Announcement Attachment Upload -")) {
      return await client.events
        .get("announcementAttachmentDelete")
        .execute(message, thread, client);
    }
  },
};
