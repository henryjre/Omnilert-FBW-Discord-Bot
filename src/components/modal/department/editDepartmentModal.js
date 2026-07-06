const { MessageFlags } = require('discord.js');

const { getDepartmentById, updateDepartment } = require('../../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildDepartmentMessagePayload,
  formatDepartmentChannelName,
  isCommandAdministrator,
  normalizeDepartmentId,
} = require('../../../utils/departmentUtils');

module.exports = {
  data: {
    name: 'editDepartmentModal',
  },
  async execute(interaction, client) {
    if (!isCommandAdministrator(interaction.member)) {
      return interaction.reply({
        content: `🔴 ERROR: This action can only be used by <@&${COMMAND_ADMINISTRATOR_ROLE_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const [, rawDepartmentId] = interaction.customId.split(':');
    const departmentId = normalizeDepartmentId(rawDepartmentId);
    const existingDepartment = departmentId ? getDepartmentById(departmentId) : null;

    if (!existingDepartment) {
      return interaction.editReply({
        content: '🔴 ERROR: Department not found.',
      });
    }

    const name = interaction.fields.getTextInputValue('departmentName').trim();
    const emoji = interaction.fields.getTextInputValue('emojiIcon').trim();
    const roleId = normalizeOptionalId(interaction.fields.getTextInputValue('roleId'));
    const channelId = normalizeOptionalId(interaction.fields.getTextInputValue('channelId'));

    if (!name || !emoji) {
      return interaction.editReply({
        content: '🔴 ERROR: Department name and emoji icon are required.',
      });
    }

    try {
      if (roleId) await resolveRole(interaction, roleId);
      const finalChannelId = channelId || null;
      const channel = finalChannelId ? await resolveChannel(interaction, finalChannelId) : null;

      const nextDepartment = {
        ...existingDepartment,
        name,
        emoji,
        role_id: roleId,
        channel_id: finalChannelId,
      };

      const formattedNameChanged =
        formatDepartmentChannelName(existingDepartment) !== formatDepartmentChannelName(nextDepartment);

      if (channel && formattedNameChanged && channel.setName) {
        await channel.setName(formatDepartmentChannelName(nextDepartment));
      }

      const updatedDepartment = updateDepartment({
        id: existingDepartment.id,
        name,
        emoji,
        roleId,
        channelId: finalChannelId,
      });

      if (!updatedDepartment) {
        return interaction.editReply({
          content: '🔴 ERROR: Department not found.',
        });
      }

      await interaction.editReply(
        buildDepartmentMessagePayload(
          'Department Updated',
          [
            `${updatedDepartment.emoji} **${updatedDepartment.name}**`,
            `**Role:** ${updatedDepartment.role_id ? `<@&${updatedDepartment.role_id}>` : 'None'}`,
            `**Channel:** ${
              updatedDepartment.channel_id ? `<#${updatedDepartment.channel_id}>` : 'None'
            }`,
          ].join('\n')
        )
      );
    } catch (error) {
      console.error('Department update failed:', error);
      return interaction.editReply({
        content: `🔴 ERROR: ${error.message}`,
      });
    }
  },
};

function normalizeOptionalId(value) {
  const normalized = value?.trim();
  return normalized || null;
}

async function resolveRole(interaction, roleId) {
  const role = interaction.guild.roles.cache.get(roleId) || (await interaction.guild.roles.fetch(roleId));
  if (!role) throw new Error(`Invalid role id: ${roleId}.`);
  return role;
}

async function resolveChannel(interaction, channelId) {
  const channel =
    interaction.guild.channels.cache.get(channelId) || (await interaction.guild.channels.fetch(channelId));
  if (!channel) throw new Error(`Invalid channel id: ${channelId}.`);
  return channel;
}
