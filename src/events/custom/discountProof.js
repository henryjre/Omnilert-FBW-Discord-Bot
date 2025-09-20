const cdnChannel = "1384688917155938354";

module.exports = {
  name: "orderDiscountProof",
  async execute(message, thread, client) {
    // Check if message has attachments
    if (message.attachments.size <= 0) return;
    const mediaAttachments = message.attachments.filter((attachment) =>
      attachment.contentType?.startsWith("image/")
    );

    if (mediaAttachments.size <= 0) return;

    const latestImageAttachment = mediaAttachments.last();

    let cdnMessage = null;
    try {
      cdnMessage = await client.channels.cache.get(cdnChannel).send({
        content: `Sent by ${message.author.toString()}\nTimestamp: ${message.createdAt.toLocaleString(
          "en-US",
          { timeZone: "Asia/Manila" }
        )}`,
        files: [latestImageAttachment.url],
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

    const cdnMessageAttachment = cdnMessage.attachments.first();

    const originalMessage = await thread.fetchStarterMessage();

    let messageEmbed = originalMessage.embeds[0];

    const messageComponents = originalMessage.components;

    // Find the component with id "posOrderVerificationConfirm"
    // Find the component with id "posOrderVerificationConfirm" and enable it
    const confirmButtonRow = messageComponents.find((row) =>
      row.components.some(
        (component) => component.customId === "posOrderVerificationConfirm"
      )
    );

    if (confirmButtonRow) {
      const confirmButtonIndex = confirmButtonRow.components.findIndex(
        (component) => component.customId === "posOrderVerificationConfirm"
      );

      if (confirmButtonIndex !== -1) {
        confirmButtonRow.components[confirmButtonIndex].data.disabled = false;
      }
    }

    messageEmbed.data.image = { url: cdnMessageAttachment.proxyURL };

    await originalMessage.edit({
      embeds: [messageEmbed],
      components: messageComponents,
    });
  },
};
