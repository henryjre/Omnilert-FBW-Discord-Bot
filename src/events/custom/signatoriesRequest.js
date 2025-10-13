const { MessageFlags } = require("discord.js");

const imageCdnChannel = "1384688917155938354";
const pdfCdnChannel = "1393578039471767612";

module.exports = {
  name: "signatoriesRequestAttachment",
  async execute(message, thread, client) {
    // Check if message has attachments
    if (message.attachments.size <= 0) return;
    const mediaAttachments = message.attachments.filter((attachment) =>
      attachment.contentType?.startsWith("image/")
    );

    const pdfAttachments = message.attachments.filter(
      (attachment) => attachment.contentType === "application/pdf"
    );

    if (mediaAttachments.size <= 0 && pdfAttachments.size <= 0) return;

    const interactedUser = message.author;

    const originalMessage = await thread.fetchStarterMessage();

    const messageEmbed = originalMessage.embeds[0];

    const authorField = messageEmbed.data.fields.find(
      (field) => field.name === "Prepared By"
    );

    if (!authorField) {
      const mentionedUser = message.mentions?.users?.first() || null;
      const mentionedRole = message.mentions?.roles?.first() || null;

      if (mentionedUser) {
        const isNotMentionedUser = message.author.id !== mentionedUser.id;
        if (isNotMentionedUser) return;
      }

      if (mentionedRole) {
        const doesNotHaveRole = !message.member.roles.cache.has(
          mentionedRole.id
        );
        if (doesNotHaveRole) return;
      }
    } else {
      if (!authorField.value.includes(interactedUser.id)) return;
    }

    // Image Attachment Handling
    if (mediaAttachments.size > 0) {
      const loaderMessage = await message.reply({
        content: "Adding your image/s...",
        flags: MessageFlags.Ephemeral,
      });

      const messageEmbedsArray = originalMessage.embeds;

      const urlsArray = mediaAttachments.map((attachment) => attachment.url);
      const cdnMessage = await client.channels.cache.get(imageCdnChannel).send({
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

      await loaderMessage.edit({
        content: "Image/s added successfully.",
      });

      setTimeout(() => {
        loaderMessage.delete();
      }, 5000);
    }

    // PDF Attachment Handling
    if (pdfAttachments.size > 0) {
      const loaderMessage = await message.reply({
        content: "Adding your document...",
        flags: MessageFlags.Ephemeral,
      });

      const latestAttachment = pdfAttachments.first();

      const cdnMessage = await client.channels.cache.get(pdfCdnChannel).send({
        content: `Sent by ${message.author.toString()}\nTimestamp: ${message.createdAt.toLocaleString(
          "en-US",
          {
            timeZone: "Asia/Manila",
          }
        )}`,
        files: [latestAttachment.url],
      });

      const cdnMessageAttachment = cdnMessage.attachments.first();

      const cdnAttachmentUrl = cdnMessageAttachment.url;

      await originalMessage.edit({
        files: [cdnAttachmentUrl],
      });

      await loaderMessage.edit({
        content: "Document added successfully.",
      });

      setTimeout(() => {
        loaderMessage.delete();
      }, 5000);
    }
  },
};
