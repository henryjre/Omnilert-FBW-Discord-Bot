const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: {
    name: `posOrderVerificationRefundReason`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const mentionedUser = interaction.message.mentions.users.first();
    const mentionedRole = interaction.message.mentions.roles.first();

    if (mentionedUser && interaction.user.id !== mentionedUser.id) {
      replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (mentionedRole && !interaction.member.roles.cache.has(mentionedRole.id)) {
      replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    return await interaction.reply({
      content: '🔴 ERROR: Branch POS channel routing is deprecated.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
