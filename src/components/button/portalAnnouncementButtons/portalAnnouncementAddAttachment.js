const { ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const {
  findPortalAttachmentThread,
  getPortalAttachmentThreadName,
  parsePortalPreviewMessage,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementAddAttachment',
  },
  async execute(interaction, client) {
    const parsed = parsePortalPreviewMessage(interaction.message);
    const replyEmbed = new EmbedBuilder();

    if (parsed.ownerId !== interaction.user.id) {
      replyEmbed.setDescription('🔴 ERROR: You cannot use this button.').setColor('Red');

      return interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const existingThread = findPortalAttachmentThread(
      interaction.message.channel,
      interaction.message.id
    );

    if (existingThread) {
      replyEmbed
        .setDescription(
          `Please go to ${existingThread} and upload your attachments there. They will appear in the preview automatically.`
        )
        .setColor('Blue');

      return interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const thread = await interaction.message.startThread({
      name: getPortalAttachmentThreadName(interaction.message.id),
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
    });

    await thread.send({
      content: `📎 **${interaction.user.toString()}, please upload your attachments here.** Supported formats: **images**, **videos**, and **PDF** files.\n\nAttachments will appear in the portal announcement preview automatically. Delete an upload message here to remove it from the preview.`,
    });

    replyEmbed.setDescription(`Please go to ${thread} and upload your attachments.`).setColor('Green');

    return interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
