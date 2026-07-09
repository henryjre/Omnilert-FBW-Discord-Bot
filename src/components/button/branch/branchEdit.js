const {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const { getBranchById } = require('../../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  isCommandAdministrator,
  normalizeBranchId,
} = require('../../../utils/branchUtils');

module.exports = {
  data: {
    name: 'branchEdit',
  },
  async execute(interaction, client) {
    if (!isCommandAdministrator(interaction.member)) {
      return interaction.reply({
        content: `🔴 ERROR: This action can only be used by <@&${COMMAND_ADMINISTRATOR_ROLE_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const [, rawBranchId, rawPage] = interaction.customId.split(':');
    const branchId = normalizeBranchId(rawBranchId);
    const page = Number(rawPage) || 0;
    const branch = branchId ? getBranchById(branchId) : null;

    if (!branch) {
      return interaction.reply({
        content: '🔴 ERROR: Branch not found.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`editBranchModal:${branch.id}:${page}`)
      .setTitle('EDIT BRANCH');

    const odooIdLabel = new LabelBuilder()
      .setLabel('Odoo ID')
      .setDescription('The Odoo company ID for this branch.')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('odooId')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(String(branch.id))
      );

    const branchNameLabel = new LabelBuilder()
      .setLabel('Branch Name')
      .setDescription('The branch display name.')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('branchName')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(branch.name)
      );

    const branchRoleInput = new TextInputBuilder()
      .setCustomId('branchRole')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    if (branch.role) branchRoleInput.setValue(branch.role);

    const branchRoleLabel = new LabelBuilder()
      .setLabel('Branch Role')
      .setDescription('Optional Discord role ID.')
      .setTextInputComponent(branchRoleInput);

    modal.addLabelComponents(odooIdLabel, branchNameLabel, branchRoleLabel);

    await interaction.showModal(modal);
  },
};
