const { EmbedBuilder, MessageFlags, ChannelType } = require("discord.js");

module.exports = {
  data: {
    name: `announcementAddAttachment`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];

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
        flags: MessageFlags.Ephemeral,
      });
    }

    const existingThread = interaction.channel.threads.cache.find((t) =>
      t.name.includes(
        `Announcement Attachment Upload - ${interaction.message.id}`
      )
    );

    if (existingThread) {
      replyEmbed
        .setDescription(`Please go to ${existingThread} and upload your attachments there. They will appear in the preview automatically.`)
        .setColor("Blue");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const thread = await interaction.message.startThread({
      name: `Announcement Attachment Upload - ${interaction.message.id}`,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
    });

    await thread.send({
      content: `📸 **${interaction.user.toString()}, please upload your attachments here.** Supported formats: **images** and **PDF** files.\n\nAttachments will appear in the announcement preview automatically. You can also delete a message here to remove it from the preview.`,
    });

    replyEmbed
      .setDescription(`Please go to ${thread} and upload your attachments.`)
      .setColor("Green");

    return await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
