const { MessageFlags } = require('discord.js');

const { getBranchById, updateBranch } = require('../../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildBranchMessagePayload,
  isCommandAdministrator,
  normalizeBranchId,
  normalizeOptionalRole,
} = require('../../../utils/branchUtils');

module.exports = {
  data: {
    name: 'editBranchModal',
  },
  async execute(interaction, client) {
    if (!isCommandAdministrator(interaction.member)) {
      return interaction.reply({
        content: `🔴 ERROR: This action can only be used by <@&${COMMAND_ADMINISTRATOR_ROLE_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const [, rawOriginalBranchId] = interaction.customId.split(':');
    const originalId = normalizeBranchId(rawOriginalBranchId);
    const existingBranch = originalId ? getBranchById(originalId) : null;

    if (!existingBranch) {
      return interaction.editReply({
        content: '🔴 ERROR: Branch not found.',
      });
    }

    const id = normalizeBranchId(interaction.fields.getTextInputValue('odooId'));
    const name = interaction.fields.getTextInputValue('branchName').trim();
    const role = normalizeOptionalRole(interaction.fields.getTextInputValue('branchRole'));

    if (!id || !name) {
      return interaction.editReply({
        content: '🔴 ERROR: Odoo ID and branch name are required.',
      });
    }

    if (id !== existingBranch.id) {
      const branchWithNewId = getBranchById(id);
      if (branchWithNewId) {
        return interaction.editReply({
          content: `🔴 ERROR: Odoo ID ${id} is already saved as **${branchWithNewId.name}**.`,
        });
      }
    }

    const updatedBranch = updateBranch({
      originalId: existingBranch.id,
      id,
      name,
      role,
    });

    if (!updatedBranch) {
      return interaction.editReply({
        content: '🔴 ERROR: Branch not found.',
      });
    }

    return interaction.editReply(
      buildBranchMessagePayload(
        'Branch Updated',
        [
          `**Odoo ID:** ${updatedBranch.id}`,
          `**Branch:** ${updatedBranch.name}`,
          `**Role:** ${updatedBranch.role ? `<@&${updatedBranch.role}>` : 'None'}`,
        ].join('\n')
      )
    );
  },
};
