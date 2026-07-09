const { MessageFlags } = require('discord.js');

const { deletePendingBranchCreation } = require('../../../sqliteFunctions');
const {
  buildBranchMessagePayload,
} = require('../../../utils/branchUtils');

module.exports = {
  data: {
    name: 'branchCreateCancel',
  },
  async execute(interaction, client) {
    const [, token] = interaction.customId.split(':');
    if (token) deletePendingBranchCreation(token);

    await interaction.update({
      ...buildBranchMessagePayload('Branch Creation Cancelled', 'No Discord resources were created.', 0x95a5a6),
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
