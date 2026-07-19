const {
  SlashCommandBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

const {
  HUMAN_RESOURCE_ROLE_ID,
  buildRenameBudget,
  buildRenameModalCustomId,
  isHumanResource,
} = require('../../utils/renameUtils.js');
const { canManageMember } = require('../../utils/discordMemberStatus.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename something!')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('employee')
        .setDescription("Rename an employee's server nickname.")
        .addUserOption((option) =>
          option
            .setName('employee')
            .setDescription('Select the employee to rename.')
            .setRequired(true)
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

function buildRenameModal(targetMember) {
  const currentNickname = targetMember.nickname || targetMember.user.username;
  // The member is known by this point, so the input can be capped at their real
  // budget (29 with a status prefix, 32 without) rather than a static number.
  const { maxNameLength, statusPrefix } = buildRenameBudget(targetMember);

  const modal = new ModalBuilder()
    .setCustomId(buildRenameModalCustomId(targetMember.id))
    .setTitle('Rename Employee');

  const currentNameInput = new TextInputBuilder()
    .setCustomId('currentName')
    .setLabel('Current name')
    .setStyle(TextInputStyle.Short)
    .setValue(currentNickname)
    .setRequired(false);

  const newNameInput = new TextInputBuilder()
    .setCustomId('newName')
    .setLabel(`New name (max ${maxNameLength} characters)`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(
      statusPrefix
        ? `The ${statusPrefix} prefix is kept automatically.`
        : 'Enter the new name.'
    )
    .setMaxLength(maxNameLength)
    .setRequired(true);

  return modal.addComponents(
    new ActionRowBuilder().addComponents(currentNameInput),
    new ActionRowBuilder().addComponents(newNameInput)
  );
}

// Guards run before showing the modal: showModal() cannot follow deferReply(),
// so every rejection path here replies directly instead.
async function renameEmployeeCommand(interaction, client) {
  if (!isHumanResource(interaction.member)) {
    return interaction.reply({
      content: `🔴 ERROR: This command can only be used by <@&${HUMAN_RESOURCE_ROLE_ID}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetMember = interaction.options.getMember('employee');

  if (!targetMember) {
    return interaction.reply({
      content: '🔴 ERROR: That user is not a member of this server.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const manageCheck = canManageMember(targetMember);

  if (!manageCheck.ok) {
    const reasonMessage =
      {
        'server owner': 'the server owner cannot be renamed.',
        'role hierarchy':
          "their highest role is above the bot's, so their nickname cannot be changed.",
      }[manageCheck.reason] || `they cannot be renamed (${manageCheck.reason}).`;

    return interaction.reply({
      content: `🔴 ERROR: Cannot rename that employee — ${reasonMessage}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.showModal(buildRenameModal(targetMember));
}

module.exports.buildRenameModal = buildRenameModal;
