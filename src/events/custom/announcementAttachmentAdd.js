const { MessageFlags, EmbedBuilder } = require("discord.js");

const MAX_EMBEDS = 10;

module.exports = {
  name: "announcementAttachmentAdd",
  async execute(message, thread, client) {
    if (message.attachments.size <= 0) return;

    const mediaAttachments = message.attachments.filter(
      (a) => a.contentType?.startsWith("image/") || a.contentType?.startsWith("video/")
    );
    const pdfAttachments = message.attachments.filter(
      (a) => a.contentType === "application/pdf"
    );

    if (mediaAttachments.size <= 0 && pdfAttachments.size <= 0) return;

    const originalMessage = await thread.fetchStarterMessage();
    if (!originalMessage) return;

    const messageEmbed = originalMessage.embeds[0];
    if (!messageEmbed) return;

    const preparedByField = messageEmbed.data.fields?.find(
      (f) => f.name === "Prepared By"
    );
    if (!preparedByField || !preparedByField.value.includes(message.author.id)) return;

    const loaderMessage = await message.reply({
      content: "Adding attachment/s to preview...",
      flags: MessageFlags.Ephemeral,
    });

    try {
      const currentEmbeds = [...originalMessage.embeds];
      const currentFiles = originalMessage.attachments.map((a) => a.url);

      if (mediaAttachments.size > 0) {
        const currentImageCount = currentEmbeds.filter(
          (e) => e.data?.image?.url
        ).length;

        const remaining = MAX_EMBEDS - currentImageCount;
        if (remaining <= 0) {
          await loaderMessage.edit({
            content: `⚠️ Cannot add more images — the ${MAX_EMBEDS}-embed limit has been reached.`,
          });
          setTimeout(() => loaderMessage.delete().catch(() => {}), 5000);
          return;
        }

        const toAdd = mediaAttachments.first(remaining);
        for (const attachment of toAdd) {
          currentEmbeds.push({
            url: "https://omnilert.odoo.com/",
            image: { url: attachment.url },
          });
        }

        await originalMessage.edit({ embeds: currentEmbeds });
      }

      if (pdfAttachments.size > 0) {
        const newFiles = [...currentFiles, ...pdfAttachments.map((a) => a.url)];
        await originalMessage.edit({ files: newFiles });
      }

      await loaderMessage.edit({ content: "✅ Attachment/s added to preview." });
    } catch (err) {
      console.error("[announcementAttachmentAdd] Error:", err);
      await loaderMessage.edit({ content: "❌ Failed to add attachment/s to preview." });
    }

    setTimeout(() => loaderMessage.delete().catch(() => {}), 5000);
  },
};
