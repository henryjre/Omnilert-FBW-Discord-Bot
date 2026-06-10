module.exports = {
  name: "announcementAttachmentDelete",
  async execute(message, thread, client) {
    if (message.partial) return;
    if (message.attachments.size <= 0) return;

    const deletedUrls = new Set(message.attachments.map((a) => a.url));

    const originalMessage = await thread.fetchStarterMessage();
    if (!originalMessage) return;

    const currentEmbeds = originalMessage.embeds;
    const filteredEmbeds = currentEmbeds.filter(
      (e) => !deletedUrls.has(e.data?.image?.url)
    );

    if (filteredEmbeds.length === currentEmbeds.length) return;

    try {
      await originalMessage.edit({ embeds: filteredEmbeds });
    } catch (err) {
      console.error("[announcementAttachmentDelete] Error:", err);
    }
  },
};
