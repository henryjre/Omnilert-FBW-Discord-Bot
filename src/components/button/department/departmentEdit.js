const {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const { getDepartmentById } = require('../../../sqliteFunctions');
const {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  isCommandAdministrator,
  normalizeDepartmentId,
} = require('../../../utils/departmentUtils');

module.exports = {
  data: {
    name: 'departmentEdit',
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

    const modal = new ModalBuilder()
      .setCustomId(`editDepartmentModal:${department.id}:${page}`)
      .setTitle('EDIT DEPARTMENT');

    const nameInput = new TextInputBuilder()
      .setCustomId('departmentName')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(department.name);

    const nameLabel = new LabelBuilder()
      .setLabel('Department Name')
      .setDescription('The display name for this department.')
      .setTextInputComponent(nameInput);

    const emojiInput = new TextInputBuilder()
      .setCustomId('emojiIcon')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(department.emoji);

    const emojiLabel = new LabelBuilder()
      .setLabel('Emoji Icon')
      .setDescription('Used in the channel name.')
      .setTextInputComponent(emojiInput);

    const roleInput = new TextInputBuilder()
      .setCustomId('roleId')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    if (department.role_id) roleInput.setValue(department.role_id);

    const roleLabel = new LabelBuilder()
      .setLabel('Role ID')
      .setDescription('Optional Discord role ID.')
      .setTextInputComponent(roleInput);

    const channelInput = new TextInputBuilder()
      .setCustomId('channelId')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    if (department.channel_id) channelInput.setValue(department.channel_id);

    const channelLabel = new LabelBuilder()
      .setLabel('Channel ID')
      .setDescription('Optional Discord channel ID.')
      .setTextInputComponent(channelInput);

    modal.addLabelComponents(nameLabel, emojiLabel, roleLabel, channelLabel);

    await interaction.showModal(modal);
  },
};
