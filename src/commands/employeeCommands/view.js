const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { getDepartments } = require('../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildDepartmentListPayload,
  isCommandAdministrator,
} = require('../../functions/helpers/departmentUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view')
    .setDescription('View bot records.')
    .addSubcommand((subcommand) =>
      subcommand.setName('departments').setDescription('View created departments.')
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'departments':
        await runViewDepartmentsCommand(interaction);
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
