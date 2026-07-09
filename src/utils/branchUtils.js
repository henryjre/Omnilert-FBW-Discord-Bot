const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorSpacingSize,
} = require('discord.js');

const COMMAND_ADMINISTRATOR_ROLE_ID = '1523620813599936623';
const BRANCH_PAGE_SIZE = 5;
const BRANCH_ALLOWED_ROLE_IDS = ['1314413671245676685', '1314815202679590984'];

function isCommandAdministrator(member) {
  return Boolean(member?.roles?.cache?.has(COMMAND_ADMINISTRATOR_ROLE_ID));
}

function normalizeBranchId(id) {
  const branchId = Number(id);
  return Number.isInteger(branchId) && branchId > 0 ? branchId : null;
}

function normalizeOptionalRole(value) {
  const normalized = value?.trim();
  return normalized || null;
}

function clampBranchPage(page, branchCount) {
  const totalPages = Math.max(1, Math.ceil(branchCount / BRANCH_PAGE_SIZE));
  const numericPage = Number(page);
  if (!Number.isInteger(numericPage) || numericPage < 0) return 0;
  return Math.min(numericPage, totalPages - 1);
}

function buildBranchListPayload(branches, page = 0) {
  const safeBranches = Array.isArray(branches) ? branches : [];
  const currentPage = clampBranchPage(page, safeBranches.length);
  const totalPages = Math.max(1, Math.ceil(safeBranches.length / BRANCH_PAGE_SIZE));
  const pageBranches = safeBranches.slice(
    currentPage * BRANCH_PAGE_SIZE,
    currentPage * BRANCH_PAGE_SIZE + BRANCH_PAGE_SIZE
  );

  const container = new ContainerBuilder()
    .setAccentColor(0x2ecc71)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`## Branches\nPage ${currentPage + 1} of ${totalPages}`)
    );

  if (pageBranches.length === 0) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('No branches have been created yet.')
      );
  }

  for (const branch of pageBranches) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            `### ${branch.name}`,
            `**Odoo ID:** ${branch.id}`,
            `**Role:** ${branch.role ? `<@&${branch.role}>` : 'None'}`,
          ].join('\n')
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`branchEdit:${branch.id}:${currentPage}`)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary)
        )
      );
  }

  if (totalPages > 1) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`branchPage:${Math.max(currentPage - 1, 0)}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`branchPage:${Math.min(currentPage + 1, totalPages - 1)}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1)
        )
      );
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function buildBranchPreviewPayload(data, token) {
  const roleName = formatBranchRoleName(data);
  const categoryName = formatBranchCategoryName(data);
  const channelName = formatBranchInquiryChannelName(data);

  const container = new ContainerBuilder()
    .setAccentColor(0xf1c40f)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Confirm Branch Creation',
          'Please review these resources before they are created.',
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          `**Odoo ID:** ${data.odooId}`,
          `**Brand:** ${data.brandName}`,
          `**Branch:** ${data.branchName}`,
          `**Branch Number:** ${data.branchNumber}`,
          `**Role:** ${roleName}`,
          `**Category:** ${categoryName}`,
          `**Channel:** ${channelName}`,
          `**Allowed Roles:** ${BRANCH_ALLOWED_ROLE_IDS.map((id) => `<@&${id}>`).join(', ')}, created branch role`,
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId(`branchCreateConfirm:${token}`)
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`branchCreateCancel:${token}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  };
}

function buildBranchMessagePayload(title, details, accentColor = 0x2ecc71) {
  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent([`## ${title}`, details].filter(Boolean).join('\n'))
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  };
}

function formatBranchRoleName(data) {
  return `${data.rolePrefix} ${data.branchName}`.trim();
}

function formatBranchCategoryName(data) {
  return `${data.categoryPrefix} ${data.branchName}`.trim();
}

function formatBranchInquiryChannelName(data) {
  return `${data.channelPrefix}┃${data.branchNumber}-inquiry`;
}

function buildPrivateBranchPermissionOverwrites(guild, roleId, botMemberId) {
  const allow = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.CreatePublicThreads,
  ];

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    ...BRANCH_ALLOWED_ROLE_IDS.map((id) => ({
      id,
      allow,
    })),
    {
      id: roleId,
      allow,
    },
  ];

  if (botMemberId) {
    overwrites.push({
      id: botMemberId,
      allow: [
        ...allow,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageThreads,
      ],
    });
  }

  return overwrites;
}

function getBrandDefaults(brand) {
  if (brand === 'monster_siomai') {
    return {
      brandName: 'Monster Siomai',
      rolePrefix: 'MS',
      categoryPrefix: '𝐌𝐒',
      channelPrefix: 'ᴍs',
    };
  }

  return {
    brandName: 'Famous Belgian Waffle',
    rolePrefix: 'FBW',
    categoryPrefix: '𝐅𝐁𝐖',
    channelPrefix: 'ꜰʙᴡ',
  };
}

module.exports = {
  BRANCH_ALLOWED_ROLE_IDS,
  BRANCH_PAGE_SIZE,
  COMMAND_ADMINISTRATOR_ROLE_ID,
  buildBranchListPayload,
  buildBranchMessagePayload,
  buildBranchPreviewPayload,
  buildPrivateBranchPermissionOverwrites,
  clampBranchPage,
  formatBranchCategoryName,
  formatBranchInquiryChannelName,
  formatBranchRoleName,
  getBrandDefaults,
  isCommandAdministrator,
  normalizeBranchId,
  normalizeOptionalRole,
};
