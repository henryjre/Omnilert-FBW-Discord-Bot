const { MessageFlags, EmbedBuilder } = require('discord.js');

const {
  HUMAN_RESOURCE_ROLE_ID,
  DISCORD_NICKNAME_MAX_LENGTH,
  RENAME_MODAL_NAME,
  buildRenamedNickname,
  isHumanResource,
  parseRenameModalCustomId,
} = require('../../../utils/renameUtils.js');
const {
  canManageMember,
  setManageableMemberNickname,
} = require('../../../utils/discordMemberStatus.js');

module.exports = {
  data: {
    name: RENAME_MODAL_NAME,
  },
  async execute(interaction, client) {
    if (!isHumanResource(interaction.member)) {
      return interaction.reply({
        content: `🔴 ERROR: This action can only be used by <@&${HUMAN_RESOURCE_ROLE_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetMemberId = parseRenameModalCustomId(interaction.customId);

    if (!targetMemberId) {
      return replyWithError(interaction, '🔴 ERROR: Could not determine which employee to rename.');
    }

    // Re-fetch rather than trusting the member captured when the modal opened:
    // roles or nickname may have changed while the form was open.
    let targetMember = null;

    try {
      targetMember = await interaction.guild.members.fetch(targetMemberId);
    } catch (error) {
      console.error('Error fetching member to rename:', error);
    }

    if (!targetMember) {
      return replyWithError(interaction, '🔴 ERROR: That user is no longer a member of this server.');
    }

    const manageCheck = canManageMember(targetMember);

    if (!manageCheck.ok) {
      const reasonMessage =
        {
          'server owner': 'the server owner cannot be renamed.',
          'role hierarchy':
            "their highest role is above the bot's, so their nickname cannot be changed.",
        }[manageCheck.reason] || `they cannot be renamed (${manageCheck.reason}).`;

      return replyWithError(interaction, `🔴 ERROR: Cannot rename that employee — ${reasonMessage}`);
    }

    const previousNickname = targetMember.nickname || targetMember.user.username;
    const requestedName = interaction.fields.getTextInputValue('newName');
    const result = buildRenamedNickname(targetMember, requestedName);

    if (!result.ok) {
      if (result.reason === 'empty') {
        return replyWithError(interaction, '🔴 ERROR: Please provide a name that is not blank.');
      }

      // The modal caps input at the same budget, so this only fires if the
      // member's prefix changed while the form was open.
      const prefixNote = result.statusPrefix
        ? ` because the ${result.statusPrefix} shift-status prefix uses the rest of Discord's ${DISCORD_NICKNAME_MAX_LENGTH}-character limit`
        : '';

      return replyWithError(
        interaction,
        `🔴 ERROR: Names are limited to **${result.maxNameLength}** characters${prefixNote}.`
      );
    }

    try {
      await setManageableMemberNickname(targetMember, result.nickname);
    } catch (error) {
      console.error('Error renaming employee:', error);
      return replyWithError(
        interaction,
        `🔴 ERROR: Failed to rename employee. ${error.message}`
      );
    }

    const successEmbed = new EmbedBuilder()
      .setDescription(
        `✅ Renamed ${targetMember.toString()}.\n\n**Before:** ${previousNickname}\n**After:** ${result.nickname}`
      )
      .setColor('Green');

    return interaction.editReply({
      embeds: [successEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

async function replyWithError(interaction, description) {
  const errorEmbed = new EmbedBuilder().setDescription(description).setColor('Red');

  return interaction.editReply({
    embeds: [errorEmbed],
    flags: MessageFlags.Ephemeral,
  });
}
