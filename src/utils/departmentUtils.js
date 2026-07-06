const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} = require('discord.js');

const COMMAND_ADMINISTRATOR_ROLE_ID = '1523620813599936623';
const DEPARTMENT_PAGE_SIZE = 3;

function isCommandAdministrator(member) {
  return Boolean(member?.roles?.cache?.has(COMMAND_ADMINISTRATOR_ROLE_ID));
}

function formatDepartmentChannelName(department) {
  return `${department.emoji}┃${department.name}`;
}

function normalizeDepartmentId(id) {
  const departmentId = Number(id);
  return Number.isInteger(departmentId) && departmentId > 0 ? departmentId : null;
}

function clampDepartmentPage(page, departmentCount) {
  const totalPages = Math.max(1, Math.ceil(departmentCount / DEPARTMENT_PAGE_SIZE));
  const numericPage = Number(page);
  if (!Number.isInteger(numericPage) || numericPage < 0) return 0;
  return Math.min(numericPage, totalPages - 1);
}

function buildDepartmentListPayload(departments, page = 0) {
  const safeDepartments = Array.isArray(departments) ? departments : [];
  const currentPage = clampDepartmentPage(page, safeDepartments.length);
  const totalPages = Math.max(1, Math.ceil(safeDepartments.length / DEPARTMENT_PAGE_SIZE));
  const pageDepartments = safeDepartments.slice(
    currentPage * DEPARTMENT_PAGE_SIZE,
    currentPage * DEPARTMENT_PAGE_SIZE + DEPARTMENT_PAGE_SIZE
  );

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`## Departments\nPage ${currentPage + 1} of ${totalPages}`)
    );

  if (pageDepartments.length === 0) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('No departments have been created yet.')
      );
  }

  for (const department of pageDepartments) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            `### ${formatDepartmentChannelName(department)}`,
            `**Role:** ${department.role_id ? `<@&${department.role_id}>` : 'None'}`,
            `**Channel:** ${department.channel_id ? `<#${department.channel_id}>` : 'None'}`,
          ].join('\n')
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`departmentEdit:${department.id}:${currentPage}`)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`departmentDelete:${department.id}:${currentPage}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger)
        )
      );
  }

  if (totalPages > 1) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`departmentPage:${Math.max(currentPage - 1, 0)}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`departmentPage:${Math.min(currentPage + 1, totalPages - 1)}`)
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

function buildDepartmentDeleteConfirmationPayload(department, page) {
  const container = new ContainerBuilder()
    .setAccentColor(0xe74c3c)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Confirm Department Delete',
          `You are about to delete **${formatDepartmentChannelName(department)}**.`,
          '',
          `**Role:** ${department.role_id ? `<@&${department.role_id}>` : 'None'}`,
          `**Channel:** ${department.channel_id ? `<#${department.channel_id}>` : 'None'}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId(`departmentDeleteConfirm:${department.id}:${page}`)
          .setLabel('Confirm Delete')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`departmentDeleteCancel:${page}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function buildDepartmentMessagePayload(title, details, accentColor = 0x2ecc71) {
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

module.exports = {
  COMMAND_ADMINISTRATOR_ROLE_ID,
  DEPARTMENT_PAGE_SIZE,
  buildDepartmentDeleteConfirmationPayload,
  buildDepartmentListPayload,
  buildDepartmentMessagePayload,
  clampDepartmentPage,
  formatDepartmentChannelName,
  isCommandAdministrator,
  normalizeDepartmentId,
};
