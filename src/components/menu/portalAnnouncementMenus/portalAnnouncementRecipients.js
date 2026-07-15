const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  buildPortalPreviewPayload,
  collectPortalThreadAttachments,
  findPortalAttachmentThread,
  parsePortalPreviewMessage,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementRecipients',
  },
  async execute(interaction, client) {
    const parsed = parsePortalPreviewMessage(interaction.message);

    if (parsed.ownerId !== interaction.user.id) {
      const replyEmbed = new EmbedBuilder()
        .setDescription('🔴 ERROR: You cannot use this menu.')
        .setColor('Red');

      return interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const thread = findPortalAttachmentThread(interaction.message.channel, interaction.message.id);
    const attachments = await collectPortalThreadAttachments(thread);

    await interaction.deferUpdate();

    await interaction.message.edit(
      buildPortalPreviewPayload({
        announcement: parsed.announcement,
        ownerId: parsed.ownerId,
        selectedRecipients: interaction.values,
        attachments,
      })
    );
  },
};
