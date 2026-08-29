const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  buildPortalPreviewPayload,
  collectPortalThreadAttachments,
  findPortalAttachmentThread,
  parsePortalPreviewMessage,
  TECHNOLOGY_ROLE_ID,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementPortalUpdate',
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

    if (!interaction.member.roles.cache.has(TECHNOLOGY_ROLE_ID)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `🔴 ERROR: Only <@&${TECHNOLOGY_ROLE_ID}> can tag an announcement as a portal update.`
        )
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
        ...parsed,
        isPortalUpdate: !parsed.isPortalUpdate,
        attachments,
      })
    );
  },
};
