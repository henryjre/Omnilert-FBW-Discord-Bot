const { ChannelType, MessageFlags } = require('discord.js');

const {
  createBranch,
  deletePendingBranchCreation,
  getBranchById,
  getPendingBranchCreation,
} = require('../../../sqliteFunctions');
const {
  buildBranchMessagePayload,
  buildPrivateBranchPermissionOverwrites,
  formatBranchCategoryName,
  formatBranchInquiryChannelName,
  formatBranchRoleName,
} = require('../../../utils/branchUtils');

module.exports = {
  data: {
    name: 'branchCreateConfirm',
  },
  async execute(interaction, client) {
    const [, token] = interaction.customId.split(':');
    const pending = token ? getPendingBranchCreation(token) : null;

    if (!pending) {
      return interaction.reply({
        content: '🔴 ERROR: Branch creation preview expired or was already used.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (pending.created_by !== interaction.user.id) {
      return interaction.reply({
        content: '🔴 ERROR: Only the user who created this preview can confirm it.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const data = pending.data;
    const existingBranch = getBranchById(data.odooId);
    if (existingBranch) {
      deletePendingBranchCreation(token);
      return interaction.editReply(
        buildBranchMessagePayload(
          'Branch Already Exists',
          `Odoo ID ${data.odooId} is already saved as **${existingBranch.name}**.`,
          0xe74c3c
        )
      );
    }

    let role;
    let category;
    let channel;

    try {
      const botMember = interaction.guild.members.me || (await interaction.guild.members.fetchMe());

      role = await interaction.guild.roles.create({
        name: formatBranchRoleName(data),
        reason: `Branch created by ${interaction.user.tag || interaction.user.id}`,
      });

      const permissionOverwrites = buildPrivateBranchPermissionOverwrites(
        interaction.guild,
        role.id,
        botMember?.id
      );

      category = await interaction.guild.channels.create({
        name: formatBranchCategoryName(data),
        type: ChannelType.GuildCategory,
        permissionOverwrites,
        reason: `Branch created by ${interaction.user.tag || interaction.user.id}`,
      });

      channel = await interaction.guild.channels.create({
        name: formatBranchInquiryChannelName(data),
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites,
        reason: `Branch created by ${interaction.user.tag || interaction.user.id}`,
      });

      const branch = createBranch({
        id: data.odooId,
        name: data.branchName,
        role: role.id,
      });

      deletePendingBranchCreation(token);

      return interaction.editReply(
        buildBranchMessagePayload(
          'Branch Created',
          [
            `**Odoo ID:** ${branch.id}`,
            `**Branch:** ${branch.name}`,
            `**Role:** <@&${role.id}>`,
            `**Category:** ${category.name}`,
            `**Channel:** <#${channel.id}>`,
          ].join('\n')
        )
      );
    } catch (error) {
      console.error('Branch creation failed:', error);
      return interaction.editReply(
        buildBranchMessagePayload(
          'Branch Creation Failed',
          `🔴 ERROR: ${error.message}`,
          0xe74c3c
        )
      );
    }
  },
};
