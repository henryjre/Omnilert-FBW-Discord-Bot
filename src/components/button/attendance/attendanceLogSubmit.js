const { ActionRowBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require('discord.js');

const hrRoleId = '1314815153421680640';

module.exports = {
  data: {
    name: `attendanceLogSubmit`,
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0];

    const approve = new ButtonBuilder()
      .setCustomId('attendanceLogApprove')
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId('attendanceLogReject')
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(approve, reject);

    await interaction.channel.send({
      content: `<@&${hrRoleId}>`,
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    await interaction.message.delete();
  },
};
