const { getBranches } = require('../../../sqliteFunctions');
const {
  buildBranchListPayload,
  normalizeBranchId,
} = require('../../../utils/branchUtils');

module.exports = {
  data: {
    name: 'branchPage',
  },
  async execute(interaction, client) {
    const [, rawPage] = interaction.customId.split(':');
    const page = normalizeBranchId(rawPage) ? Number(rawPage) : 0;
    const branches = getBranches();

    await interaction.update(buildBranchListPayload(branches, page));
  },
};
