const {
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorSpacingSize,
} = require('discord.js');

const { createDepartment } = require('../../../sqliteFunctions');

const commandAdministratorRoleId = '1523620813599936623';
const managementRoleId = '1314413671245676685';

module.exports = {
  data: {
    name: 'createDepartmentModal',
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has(commandAdministratorRoleId)) {
      return interaction.reply({
        content: `🔴 ERROR: This action can only be used by <@&${commandAdministratorRoleId}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const departmentName = interaction.fields.getTextInputValue('departmentName').trim();
    const emojiIcon = interaction.fields.getTextInputValue('emojiIcon').trim();
    const submittedRoleId = normalizeOptionalId(interaction.fields.getTextInputValue('roleId'));
    const submittedChannelId = normalizeOptionalId(interaction.fields.getTextInputValue('channelId'));

    if (!departmentName || !emojiIcon) {
      return interaction.editReply({
        content: '🔴 ERROR: Department name and emoji icon are required.',
      });
    }

    let role = null;
    let channel = null;

    try {
      role = submittedRoleId
        ? await resolveRole(interaction, submittedRoleId)
        : await createRole(interaction, departmentName);
    } catch (error) {
      console.error('Department role setup failed:', error);
      return interaction.editReply({
        content: `🔴 ERROR: ${error.message}`,
      });
    }

    try {
      channel = submittedChannelId
        ? await resolveChannel(interaction, submittedChannelId)
        : await createPrivateDepartmentChannel(interaction, departmentName, emojiIcon);
    } catch (error) {
      console.error('Department channel setup failed:', error);
      return interaction.editReply({
        content: `🔴 ERROR: ${error.message}`,
      });
    }

    let department;
    try {
      department = createDepartment({
        name: departmentName,
        emoji: emojiIcon,
        roleId: role?.id || null,
        channelId: channel?.id || null,
        createdBy: interaction.user.id,
      });
    } catch (error) {
      console.error('Department database save failed:', error);
      return interaction.editReply({
        content: '🔴 ERROR: Department resources were created or validated, but saving to the database failed.',
      });
    }

    const successContainer = buildSuccessContainer({
      department,
      role,
      channel,
      creatorId: interaction.user.id,
    });

    await interaction.editReply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

function normalizeOptionalId(value) {
  const normalized = value?.trim();
  return normalized || null;
}

async function resolveRole(interaction, roleId) {
  const role = interaction.guild.roles.cache.get(roleId) || (await interaction.guild.roles.fetch(roleId));

  if (!role) {
    throw new Error(`Invalid role id: ${roleId}.`);
  }

  return role;
}

async function createRole(interaction, departmentName) {
  try {
    return await interaction.guild.roles.create({
      name: departmentName,
      reason: `Department created by ${interaction.user.tag || interaction.user.id}`,
    });
  } catch (error) {
    throw new Error(`Could not create the department role. ${error.message}`);
  }
}

async function resolveChannel(interaction, channelId) {
  const channel =
    interaction.guild.channels.cache.get(channelId) || (await interaction.guild.channels.fetch(channelId));

  if (!channel) {
    throw new Error(`Invalid channel id: ${channelId}.`);
  }

  return channel;
}

async function createPrivateDepartmentChannel(interaction, departmentName, emojiIcon) {
  const botMember = interaction.guild.members.me || (await interaction.guild.members.fetchMe());
  const channelName = `${emojiIcon}┃${departmentName}`;

  try {
    return await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: managementRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: botMember.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
      reason: `Department created by ${interaction.user.tag || interaction.user.id}`,
    });
  } catch (error) {
    throw new Error(`Could not create the private department channel. ${error.message}`);
  }
}

function buildSuccessContainer({ department, role, channel, creatorId }) {
  return new ContainerBuilder()
    .setAccentColor(0x2ecc71)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`## ✅ Department Created\n${department.emoji} **${department.name}**`)
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          `**Department ID:** ${department.id}`,
          `**Role:** ${role ? `<@&${role.id}>` : 'None'}`,
          `**Channel:** ${channel ? `<#${channel.id}>` : 'None'}`,
          `**Created By:** <@${creatorId}>`,
        ].join('\n')
      )
    );
}
