const { EmbedBuilder, MessageFlags, ChannelType } = require("discord.js");

const cdnChannel = "1384688917155938354";

module.exports = {
  data: {
    name: `announcementAddAttachment`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Prepared By"
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
      });
    }

    const existingThread = await interaction.channel.threads.cache.find((t) =>
      t.name.includes(
        `Announcement Attachment Upload - ${interaction.message.id}`
      )
    );

    if (existingThread) {
      await interaction.deferUpdate();
      const attachments = await fetchThreadAttachments(
        interaction,
        existingThread
      );
      const embedsToSend = [];
      const filesToSend = [];

      if (attachments.media.length > 0) {
        attachments.media.forEach((attachment) =>
          embedsToSend.push(
            new EmbedBuilder(messageEmbed.data)
              .setImage(attachment)
              .setURL("https://omnilert.odoo.com/")
          )
        );
        attachments.pdf.forEach((attachment) => filesToSend.push(attachment));
      } else {
        const mainEmbed = new EmbedBuilder(messageEmbed.data).setImage("");
        embedsToSend.push(mainEmbed);
      }

      await interaction.message.edit({
        embeds: embedsToSend,
        files: filesToSend,
      });

      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const thread = await interaction.message.startThread({
      name: `Announcement Attachment Upload - ${interaction.message.id}`,
      autoArchiveDuration: 60, // Archive after 1 hour
      type: ChannelType.PrivateThread, // Set to 'GuildPrivateThread' if only the user should see it
    });

    await thread.send({
      content: `📸 **${interaction.user.toString()}, please upload the attachments here. Currently, you can only attach **IMAGES** and **PDF** files to the announcement.`,
    });

    replyEmbed
      .setDescription(`Please go to ${thread} and upload your attachments.`)
      .setColor("Green");

    return await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};

async function fetchThreadAttachments(interaction, thread, client) {
  const attachments = {
    media: [],
    pdf: [],
  };

  try {
    // Fetch the last 100 messages from the thread
    const messages = await thread.messages.fetch({ limit: 100 });

    const reversedMessages = messages.reverse();

    for (const msg of reversedMessages) {
      for (const attachment of msg.attachments) {
        const contentType = attachment.contentType;

        try {
          const cdnMessage = await client.channels.cache.get(cdnChannel).send({
            content: `Sent by ${msg.author.toString()}\nTimestamp: ${msg.createdAt.toLocaleString(
              "en-US",
              {
                timeZone: "Asia/Manila",
              }
            )}`,
            files: [attachment.url],
          });

          const cdnMessageAttachment = cdnMessage.attachments.first();
          if (!cdnMessageAttachment) continue;

          const attachmentUrl =
            cdnMessageAttachment.proxyURL || cdnMessageAttachment.url;

          // Filter for media (images/videos) and PDF files
          if (
            contentType?.startsWith("image/") ||
            contentType?.startsWith("video/")
          ) {
            attachments.media.push(attachmentUrl);
          } else if (contentType === "application/pdf") {
            attachments.pdf.push(attachmentUrl);
          }
        } catch (attachmentError) {
          console.error(
            `Error processing attachment: ${attachmentError.message}`
          );
          // Continue with next attachment even if one fails
          continue;
        }
      }
    }

    console.log("Attachments:", attachments);
    return attachments;
  } catch (error) {
    console.error("Error fetching thread attachments:", error);
    return attachments;
  }
}
