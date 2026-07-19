const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');

const {
  HUMAN_RESOURCE_ROLE_ID,
  DISCORD_NICKNAME_MAX_LENGTH,
  buildRenamedNickname,
  isHumanResource,
} = require('../../utils/renameUtils.js');
const {
  canManageMember,
  setManageableMemberNickname,
} = require('../../utils/discordMemberStatus.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename something!')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('employee')
        .setDescription("Rename an employee's server nickname.")
        .addUserOption((option) =>
          option.setName('employee').setDescription('Select the employee to rename.').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('The new name. Limited to 29 characters when a shift-status emoji is set.')
            .setRequired(true)
            // Kept at the Discord maximum on purpose: the real budget depends on
            // whether the member has a status prefix, so it is enforced below.
            .setMaxLength(DISCORD_NICKNAME_MAX_LENGTH)
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'employee':
        await renameEmployeeCommand(interaction, client);
        break;

      default:
        break;
    }
  },
};

async function replyWithError(interaction, description) {
  const errorEmbed = new EmbedBuilder().setDescription(description).setColor('Red');

  await interaction.editReply({
    embeds: [errorEmbed],
    flags: MessageFlags.Ephemeral,
  });
}

async function renameEmployeeCommand(interaction, client) {
  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  if (!isHumanResource(interaction.member)) {
    await replyWithError(
      interaction,
      `🔴 ERROR: This command can only be used by <@&${HUMAN_RESOURCE_ROLE_ID}>.`
    );
    return;
  }

  const targetMember = interaction.options.getMember('employee');

  if (!targetMember) {
    await replyWithError(interaction, '🔴 ERROR: That user is not a member of this server.');
    return;
  }

  const manageCheck = canManageMember(targetMember);

  if (!manageCheck.ok) {
    const reasonMessage =
      {
        'server owner': 'the server owner cannot be renamed.',
        'role hierarchy': "their highest role is above the bot's, so their nickname cannot be changed.",
      }[manageCheck.reason] || `they cannot be renamed (${manageCheck.reason}).`;

    await replyWithError(interaction, `🔴 ERROR: Cannot rename that employee — ${reasonMessage}`);
    return;
  }

  const previousNickname = targetMember.nickname || targetMember.user.username;
  const requestedName = interaction.options.getString('name');
  const result = buildRenamedNickname(targetMember, requestedName);

  if (!result.ok) {
    if (result.reason === 'empty') {
      await replyWithError(interaction, '🔴 ERROR: Please provide a name that is not blank.');
      return;
    }

    // Spell out why the budget is under Discord's 32, otherwise someone who
    // counted 30 characters will assume the bot is broken.
    const prefixNote = result.statusPrefix
      ? ` because the ${result.statusPrefix} shift-status prefix uses the rest of Discord's ${DISCORD_NICKNAME_MAX_LENGTH}-character limit`
      : '';

    await replyWithError(
      interaction,
      `🔴 ERROR: Names are limited to **${result.maxNameLength}** characters${prefixNote}.`
    );
    return;
  }

  try {
    await setManageableMemberNickname(targetMember, result.nickname);
  } catch (error) {
    console.error('Error renaming employee:', error);
    await replyWithError(interaction, `🔴 ERROR: Failed to rename employee. ${error.message}`);
    return;
  }

  const successEmbed = new EmbedBuilder()
    .setDescription(
      `✅ Renamed ${targetMember.toString()}.\n\n**Before:** ${previousNickname}\n**After:** ${result.nickname}`
    )
    .setColor('Green');

  await interaction.editReply({
    embeds: [successEmbed],
    flags: MessageFlags.Ephemeral,
  });
}
