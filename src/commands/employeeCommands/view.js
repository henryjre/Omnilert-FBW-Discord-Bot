const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { getBranches, getDepartments } = require('../../sqliteFunctions');
const {
  buildBranchListPayload,
} = require('../../utils/branchUtils');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildDepartmentListPayload,
  isCommandAdministrator,
} = require('../../utils/departmentUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view')
    .setDescription('View bot records.')
    .addSubcommand((subcommand) =>
      subcommand.setName('departments').setDescription('View created departments.')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('branches').setDescription('View created branches.')
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'departments':
        await runViewDepartmentsCommand(interaction);
        break;
      case 'branches':
        await runViewBranchesCommand(interaction);
        break;
      default:
        break;
    }
  },
};

async function runViewDepartmentsCommand(interaction) {
  if (!isCommandAdministrator(interaction.member)) {
    return interaction.reply({
      content: `🔴 ERROR: This command can only be used by <@&${COMMAND_ADMINISTRATOR_ROLE_ID}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const departments = getDepartments();
  await interaction.reply({
    ...buildDepartmentListPayload(departments, 0),
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}

async function runViewBranchesCommand(interaction) {
  if (!isCommandAdministrator(interaction.member)) {
    return interaction.reply({
      content: `🔴 ERROR: This command can only be used by <@&${COMMAND_ADMINISTRATOR_ROLE_ID}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const branches = getBranches();
  await interaction.reply({
    ...buildBranchListPayload(branches, 0),
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  });
}
