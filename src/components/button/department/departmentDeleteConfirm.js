const { MessageFlags } = require('discord.js');

const { deleteDepartment, getDepartmentById, getDepartments } = require('../../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildDepartmentListPayload,
  isCommandAdministrator,
  normalizeDepartmentId,
} = require('../../../functions/helpers/departmentUtils');

module.exports = {
  data: {
    name: 'departmentDeleteConfirm',
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

    try {
      if (department.channel_id) {
        const channel =
          interaction.guild.channels.cache.get(department.channel_id) ||
          (await interaction.guild.channels.fetch(department.channel_id).catch(() => null));
        if (channel?.delete) await channel.delete(`Department ${department.id} deleted`);
      }

      if (department.role_id) {
        const role =
          interaction.guild.roles.cache.get(department.role_id) ||
          (await interaction.guild.roles.fetch(department.role_id).catch(() => null));
        if (role?.delete) await role.delete(`Department ${department.id} deleted`);
      }

      deleteDepartment(department.id);
    } catch (error) {
      console.error('Department delete failed:', error);
      return interaction.reply({
        content: `🔴 ERROR: Could not delete department resources. ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const departments = getDepartments();
    await interaction.update(buildDepartmentListPayload(departments, page));
  },
};
