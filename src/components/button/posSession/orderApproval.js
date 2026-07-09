const {
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: {
    name: `posOrderVerificationApprove`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const messageMention = interaction.message.mentions.users.first();

    if (interaction.user.id !== messageMention?.id) {
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
