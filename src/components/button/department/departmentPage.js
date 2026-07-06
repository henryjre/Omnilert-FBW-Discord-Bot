const { MessageFlags } = require('discord.js');

const { getDepartments } = require('../../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildDepartmentListPayload,
  isCommandAdministrator,
} = require('../../../utils/departmentUtils');

module.exports = {
  data: {
    name: 'departmentPage',
  },
  async execute(interaction, client) {
    if (!isCommandAdministrator(interaction.member)) {
      return interaction.reply({
        content: `🔴 ERROR: This action can only be used by <@&${COMMAND_ADMINISTRATOR_ROLE_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const [, page] = interaction.customId.split(':');
    const departments = getDepartments();

    await interaction.update(buildDepartmentListPayload(departments, Number(page)));
  },
};
