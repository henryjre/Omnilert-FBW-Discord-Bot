const cdnChannel = "1384688917155938354";
const {
  DISCORD_MAX_FILE_SIZE_BYTES,
  compressBufferToLimit,
} = require("../../utils/imageCompression");

const DOWNLOAD_TIMEOUT_MS = 20_000;
const MAX_DOWNLOAD_BYTES = 35 * 1024 * 1024;

/**
 * Downloads an image attachment and validates response size.
 *
 * @param {string} url The source URL from Discord CDN.
 * @returns {Promise<Buffer>}
 */
async function downloadAttachmentBuffer(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}.`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  const contentLength =
    contentLengthHeader !== null ? Number.parseInt(contentLengthHeader, 10) : null;

  if (Number.isInteger(contentLength) && contentLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("Image is too large to process safely.");
  }

  const imageArrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(imageArrayBuffer);

  if (imageBuffer.length > MAX_DOWNLOAD_BYTES) {
    throw new Error("Image is too large to process safely.");
  }

  return imageBuffer;
}

/**
 * Builds an upload payload for Discord files.
 *
 * @param {import("discord.js").Attachment} attachment The original Discord attachment object.
 * @returns {Promise<{files: Array<string | {attachment: Buffer, name: string}>}>}
 */
async function buildUploadFilesPayload(attachment) {
  const hasKnownSize = Number.isInteger(attachment.size) && attachment.size > 0;
  const shouldCompress = hasKnownSize && attachment.size > DISCORD_MAX_FILE_SIZE_BYTES;

  if (!shouldCompress) {
    return { files: [attachment.url] };
  }

  const downloadedBuffer = await downloadAttachmentBuffer(attachment.url);
  const compressionResult = await compressBufferToLimit(downloadedBuffer, {
    maxBytes: DISCORD_MAX_FILE_SIZE_BYTES,
  });

  if (!compressionResult) {
    throw new Error("Unable to compress image under Discord limit.");
  }

  const uploadedFileName = `discount-proof-compressed.${compressionResult.extension}`;

  return {
    files: [
      {
        attachment: compressionResult.outputBuffer,
        name: uploadedFileName,
      },
    ],
  };
}

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

    if (!latestImageAttachment?.url) return;

    const cdnTargetChannel = client.channels.cache.get(cdnChannel);
    if (!cdnTargetChannel) {
      console.error(`Channel ${cdnChannel} not found in cache.`);
      return;
    }

    let uploadPayload = null;

    try {
      uploadPayload = await buildUploadFilesPayload(latestImageAttachment);
    } catch (error) {
      console.error("Image preparation failed:", error);
      await cdnTargetChannel.send({
        content:
          "❌ Failed to process image for upload. Please send a smaller or less complex image.",
      });
      return;
    }

    let cdnMessage = null;
    try {
      cdnMessage = await cdnTargetChannel.send({
        content: `Sent by ${message.author.toString()}\nTimestamp: ${message.createdAt.toLocaleString(
          "en-US",
          { timeZone: "Asia/Manila" }
        )}`,
        files: uploadPayload.files,
      });
    } catch (err) {
      if (err.status === 413) {
        // File too large → send error message in Discord
        await cdnTargetChannel.send({
          content: "❌ Failed to upload file — the file is still too large to send.",
        });
      } else {
        console.error("Unexpected send error:", err);
        await cdnTargetChannel.send({
          content: "⚠️ An unexpected error occurred while trying to upload a file.",
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
