const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ThreadAutoArchiveDuration,
} = require("discord.js");

const destinationChannelId = "1346829261985681418";

module.exports = {
  data: {
    name: `confirmIncidentButton`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetChannel = await client.channels.fetch(destinationChannelId);

    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Reported By"
    );

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    messageEmbed.data.description = "";

    const sentMessage = await targetChannel.send({ embeds: [messageEmbed] });

    let newMessageEmbed = sentMessage.embeds[0];

    if (interaction.message.hasThread) {
      const oldThread = interaction.message.thread;

      // Fetch all messages from the old thread
      const oldMessages = await oldThread.messages.fetch({ limit: 100 });

      // Filter messages that contain images/videos
      const mediaMessages = oldMessages.filter((msg) =>
        msg.attachments.some(
          (attachment) =>
            attachment.contentType?.startsWith("image/") ||
            attachment.contentType?.startsWith("video/")
        )
      );

      // If no media messages, exit early
      if (mediaMessages.size === 0) return;

      // Now that we know media exists, create a new thread
      const newThread = await sentMessage.startThread({
        name: `Uploaded Proof - ${sentMessage.id}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      });

      // Send only media files to the new thread
      for (const [, msg] of mediaMessages) {
        for (const [, attachment] of msg.attachments) {
          if (
            attachment.contentType?.startsWith("image/") ||
            attachment.contentType?.startsWith("video/")
          ) {
            await newThread.send({ files: [attachment.url] });
          }
        }
      }

      newMessageEmbed.data.fields.find(
        (f) => f.name === "Images/Video Proof"
      ).value = `📸 | ${newThread.id}`;

      await sentMessage.edit({ embeds: [newMessageEmbed] });

      await oldThread.delete();
    }

    await interaction.message.delete();

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `You have confirmed the report. It was moved to ${targetChannel}.`
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
