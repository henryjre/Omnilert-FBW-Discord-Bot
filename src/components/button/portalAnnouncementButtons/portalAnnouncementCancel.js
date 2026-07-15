const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  deletePortalAttachmentThreadForMessage,
  parsePortalPreviewMessage,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementCancel',
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const parsed = parsePortalPreviewMessage(interaction.message);

    if (parsed.ownerId !== interaction.user.id) {
      const replyEmbed = new EmbedBuilder()
        .setDescription('🔴 ERROR: You cannot use this button.')
        .setColor('Red');

      return interaction.editReply({
        embeds: [replyEmbed],
      });
    }

    await deletePortalAttachmentThreadForMessage(interaction.message, client);
    await interaction.message.delete();

    const cancelEmbed = new EmbedBuilder()
      .setDescription('You have cancelled the portal announcement.')
      .setColor('Red');

    return interaction.editReply({
      embeds: [cancelEmbed],
    });
  },
};
