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
 * Builds upload entries for image attachments.
 * Compresses each oversized image before upload when possible.
 *
 * @param {import("discord.js").Collection<string, import("discord.js").Attachment>} mediaAttachments Image attachments.
 * @returns {Promise<Array<string | {attachment: Buffer, name: string}>>}
 */
async function buildUploadFiles(mediaAttachments) {
  const uploadFiles = [];

  for (const [, attachment] of mediaAttachments) {
    if (!attachment?.url) {
      continue;
    }

    const hasKnownSize = Number.isInteger(attachment.size) && attachment.size > 0;
    const shouldCompress = hasKnownSize && attachment.size > DISCORD_MAX_FILE_SIZE_BYTES;

    if (!shouldCompress) {
      uploadFiles.push(attachment.url);
      continue;
    }

    const downloadedBuffer = await downloadAttachmentBuffer(attachment.url);
    const compressionResult = await compressBufferToLimit(downloadedBuffer, {
      maxBytes: DISCORD_MAX_FILE_SIZE_BYTES,
    });

    if (!compressionResult) {
      throw new Error("Unable to compress one or more images under Discord limit.");
    }

    uploadFiles.push({
      attachment: compressionResult.outputBuffer,
      name: `ispe-proof-compressed-${attachment.id}.${compressionResult.extension}`,
    });
  }

  return uploadFiles;
}

module.exports = {
  name: "ispeOrderProof",
  async execute(message, thread, client) {
    // Check if message has attachments
    if (message.attachments.size <= 0) return;
    const mediaAttachments = message.attachments.filter((attachment) =>
      attachment.contentType?.startsWith("image/")
    );

    if (mediaAttachments.size <= 0) return;

    const cdnTargetChannel = client.channels.cache.get(cdnChannel);
    if (!cdnTargetChannel) {
      console.error(`Channel ${cdnChannel} not found in cache.`);
      return;
    }

    let uploadFiles = null;
    try {
      uploadFiles = await buildUploadFiles(mediaAttachments);
    } catch (error) {
      console.error("Image preparation failed:", error);
      await cdnTargetChannel.send({
        content:
          "❌ Failed to process one or more images for upload. Please send smaller or less complex images.",
      });
      return;
    }

    if (!Array.isArray(uploadFiles) || uploadFiles.length === 0) {
      return;
    }

    let cdnMessage = null;
    try {
      cdnMessage = await cdnTargetChannel.send({
        content: `Sent by ${message.author.toString()}\nTimestamp: ${message.createdAt.toLocaleString(
          "en-US",
          {
            timeZone: "Asia/Manila",
          }
        )}`,
        files: uploadFiles,
      });
    } catch (err) {
      if (err.status === 413) {
        // File too large → send error message in Discord
        await cdnTargetChannel.send({
          content: "❌ Failed to upload file — one or more files are still too large to send.",
        });
      } else {
        console.error("Unexpected send error:", err);
        await cdnTargetChannel.send({
          content: "⚠️ An unexpected error occurred while trying to upload a file.",
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
