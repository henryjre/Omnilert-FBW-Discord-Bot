const { MessageFlags } = require('discord.js');

const { getDepartmentById } = require('../../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildDepartmentDeleteConfirmationPayload,
  isCommandAdministrator,
  normalizeDepartmentId,
} = require('../../../utils/departmentUtils');

module.exports = {
  data: {
    name: 'departmentDelete',
  },
  async execute(interaction, client) {
    if (!isCommandAdministrator(interaction.member)) {
      return interaction.reply({
        content: `🔴 ERROR: This action can only be used by <@&${COMMAND_ADMINISTRATOR_ROLE_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const [, rawDepartmentId, rawPage] = interaction.customId.split(':');
    const departmentId = normalizeDepartmentId(rawDepartmentId);
    const page = Number(rawPage) || 0;
    const department = departmentId ? getDepartmentById(departmentId) : null;

    if (!department) {
      return interaction.reply({
        content: '🔴 ERROR: Department not found.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.update(buildDepartmentDeleteConfirmationPayload(department, page));
  },
};
