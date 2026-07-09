const { MessageFlags } = require('discord.js');

const {
  createPendingBranchCreation,
  getBranchById,
} = require('../../../sqliteFunctions');
const {
  buildBranchPreviewPayload,
  getBrandDefaults,
  normalizeBranchId,
} = require('../../../utils/branchUtils');

module.exports = {
  data: {
    name: 'createBranchModal',
  },
  async execute(interaction, client) {
    const [, rawOdooId, brand] = interaction.customId.split(':');
    const odooId = normalizeBranchId(rawOdooId);
    const defaults = getBrandDefaults(brand);

    if (!odooId) {
      return interaction.reply({
        content: '🔴 ERROR: Invalid Odoo ID.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const existingBranch = getBranchById(odooId);
    if (existingBranch) {
      return interaction.reply({
        content: `🔴 ERROR: Odoo ID ${odooId} is already saved as **${existingBranch.name}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const data = {
      odooId,
      brand,
      brandName: defaults.brandName,
      branchName: interaction.fields.getTextInputValue('branchName').trim(),
      branchNumber: interaction.fields.getTextInputValue('branchNumber').trim(),
      rolePrefix: interaction.fields.getTextInputValue('rolePrefix').trim(),
      categoryPrefix: interaction.fields.getTextInputValue('categoryPrefix').trim(),
      channelPrefix: interaction.fields.getTextInputValue('channelPrefix').trim(),
    };

    if (
      !data.branchName ||
      !data.branchNumber ||
      !data.rolePrefix ||
      !data.categoryPrefix ||
      !data.channelPrefix
    ) {
      return interaction.reply({
        content: '🔴 ERROR: Branch name, branch number, and all prefixes are required.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const token = createPendingBranchCreation(data, interaction.user.id);
    await interaction.reply(buildBranchPreviewPayload(data, token));
  },
};
