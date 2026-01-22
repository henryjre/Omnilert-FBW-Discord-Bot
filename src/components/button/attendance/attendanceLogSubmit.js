const { ActionRowBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require('discord.js');
const { incrementThreadApprovals, getThreadApprovals } = require('../../../sqliteFunctions');
const { isScheduleChannel, updateStarterMessageApprovals } = require('../../../functions/helpers/approvalCounterUtils');

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

    const sentMessage = await interaction.channel.send({
      content: `<@&${hrRoleId}>`,
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    // Track approval count if in a schedule channel
    if (interaction.channel.isThread() && isScheduleChannel(interaction.channel.parentId)) {
      try {
        const starterMessage = await interaction.channel.fetchStarterMessage();

        // Increment approval count in database
        incrementThreadApprovals(interaction.channel.id, interaction.channel.parentId, starterMessage.id);

        // Get updated count
        const { current_approvals } = getThreadApprovals(interaction.channel.id);

        // Update starter message button
        await updateStarterMessageApprovals(interaction.channel, current_approvals);
      } catch (error) {
        console.error('Error tracking approval count:', error.message);
      }
    }

    await interaction.message.delete();
  },
};
