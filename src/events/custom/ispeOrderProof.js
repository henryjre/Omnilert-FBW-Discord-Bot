const cdnChannel = "1384688917155938354";

module.exports = {
  name: "ispeOrderProof",
  async execute(message, thread, client) {
    // Check if message has attachments
    if (message.attachments.size <= 0) return;
    const mediaAttachments = message.attachments.filter((attachment) =>
      attachment.contentType?.startsWith("image/")
    );

    if (mediaAttachments.size <= 0) return;

    const urlsArray = mediaAttachments.map((attachment) => attachment.url);

    let cdnMessage = null;
    try {
      cdnMessage = await client.channels.cache.get(cdnChannel).send({
        content: `Sent by ${message.author.toString()}\nTimestamp: ${message.createdAt.toLocaleString(
          "en-US",
          {
            timeZone: "Asia/Manila",
          }
        )}`,
        files: urlsArray,
      });
    } catch (err) {
      if (err.status === 413) {
        // File too large → send error message in Discord
        await client.channels.cache.get(cdnChannel).send({
          content: `❌ Failed to upload file — the file is too large to send.`,
        });
      } else {
        console.error("Unexpected send error:", err);
        await client.channels.cache.get(cdnChannel).send({
          content: `⚠️ An unexpected error occurred while trying to upload a file.`,
        });
      }
    }

    if (!cdnMessage) return;

    const cdnMessageAttachment = cdnMessage.attachments;

    const cdnAttachmentsUrls = cdnMessageAttachment.map(
      (attachment) => attachment.proxyURL
    );

    const originalMessage = await thread.fetchStarterMessage();

    let messageEmbed = originalMessage.embeds[0];

    const messageEmbedsArray = originalMessage.embeds;

    const cashierField = messageEmbed.data.fields.find(
      (field) => field.name === "Cashier"
    );

    if (!cashierField) {
      messageEmbed.data.fields.push({
        name: "Cashier",
        value: message.author.toString(),
      });
    }

    for (const attachment of cdnAttachmentsUrls) {
      const attachmentEmbed = {
        url: "https://omnilert.odoo.com/",
        image: {
          url: attachment,
        },
      };

      messageEmbedsArray.push(attachmentEmbed);
    }

    await originalMessage.edit({
      embeds: messageEmbedsArray,
    });
  },
};
