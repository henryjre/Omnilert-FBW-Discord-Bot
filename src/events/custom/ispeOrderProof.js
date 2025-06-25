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

    const cdnMessage = await client.channels.cache.get(cdnChannel).send({
      content: `Sent by ${message.author.toString()}\nTimestamp: ${message.createdAt.toLocaleString(
        "en-US",
        {
          timeZone: "Asia/Manila",
        }
      )}`,
      files: urlsArray,
    });

    const cdnMessageAttachment = cdnMessage.attachments;

    const cdnAttachmentsUrls = cdnMessageAttachment.map(
      (attachment) => attachment.proxyURL
    );

    const originalMessage = await thread.fetchStarterMessage();

    let messageEmbed = originalMessage.embeds[0];

    const messageEmbedsArray = originalMessage.embeds;

    messageEmbed.data.fields.push({
      name: "Cashier",
      value: message.author.toString(),
    });

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
