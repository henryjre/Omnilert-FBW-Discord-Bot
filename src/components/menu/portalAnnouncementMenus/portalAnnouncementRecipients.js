const { EmbedBuilder, MessageFlags } = require('discord.js');
const {
  buildPortalPreviewPayload,
  collectPortalThreadAttachments,
  findPortalAttachmentThread,
  parsePortalPreviewMessage,
  partitionRecipientsByRole,
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

    const { allowed, rejected } = partitionRecipientsByRole(
      interaction.values,
      interaction.guild
    );

    // @everyone is toggled by its own button, so preserve it across role edits.
    const selectedRecipients = parsed.selectedRecipients.includes('@everyone')
      ? ['@everyone', ...allowed]
      : allowed;

    const thread = findPortalAttachmentThread(interaction.message.channel, interaction.message.id);
    const attachments = await collectPortalThreadAttachments(thread);

    await interaction.deferUpdate();

    await interaction.message.edit(
      buildPortalPreviewPayload({
        ...parsed,
        selectedRecipients,
        attachments,
      })
    );

    if (rejected.length > 0) {
      const reason = (entry) =>
        entry.managed ? 'bot/integration role' : 'not mentionable';
      const details = rejected.map((entry) => `• ${entry.name} — ${reason(entry)}`);

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          ['🟡 Some roles were skipped:', ...details].join('\n')
        )
        .setColor('Yellow');

      await interaction.followUp({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
