const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  buildPortalFinalPayload,
  collectPortalThreadAttachments,
  deletePortalAttachmentThreadForMessage,
  findPortalAttachmentThread,
  parsePortalPreviewMessage,
  PORTAL_ANNOUNCEMENT_CHANNEL_ID,
  PORTAL_QUESTION_THREAD_TITLE,
} = require('../../../functions/helpers/portalAnnouncementUtils');

async function resolveAnnouncementChannel(client) {
  const cached = client.channels.cache.get(PORTAL_ANNOUNCEMENT_CHANNEL_ID);
  if (cached) return cached;
  return client.channels.fetch(PORTAL_ANNOUNCEMENT_CHANNEL_ID);
}

module.exports = {
  data: {
    name: 'portalAnnouncementSubmit',
  },
  async execute(interaction, client) {
    const parsed = parsePortalPreviewMessage(interaction.message);

    if (parsed.ownerId !== interaction.user.id) {
      const replyEmbed = new EmbedBuilder()
        .setDescription('🔴 ERROR: You cannot use this button.')
        .setColor('Red');

      return interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (parsed.selectedRecipients.length === 0) {
      const replyEmbed = new EmbedBuilder()
        .setDescription('🔴 ERROR: Please select at least one recipient before announcing.')
        .setColor('Red');

      return interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const thread = findPortalAttachmentThread(interaction.message.channel, interaction.message.id);
    const attachments = await collectPortalThreadAttachments(thread);
    const channel = await resolveAnnouncementChannel(client);

    const announcementMessage = await channel.send(
      buildPortalFinalPayload({
        announcement: parsed.announcement,
        selectedRecipients: parsed.selectedRecipients,
        attachments,
      })
    );

    await announcementMessage.startThread({
      name: PORTAL_QUESTION_THREAD_TITLE,
      autoArchiveDuration: 1440,
    });

    await deletePortalAttachmentThreadForMessage(interaction.message, client);
    await interaction.message.delete();
  },
};
