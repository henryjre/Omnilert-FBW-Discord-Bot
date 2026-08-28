const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
} = require('discord.js');
const { TECHNOLOGY_TICKET_CATEGORIES } = require('./technologyTicketAi');
const { TECHNOLOGY_DEPARTMENT_ROLE_ID } = require('./technologyTicketConstants');

const PANEL_ACCENT = 0x2b6f77;
const STATUS_ACCENTS = {
  OPEN: 0x2f80ed,
  REOPENED: 0xf2a93b,
  CLOSED: 0x2e8b57,
  CREATING: 0x7f8c8d,
  FAILED: 0xc0392b,
};
const STATUS_LABELS = {
  OPEN: 'Open',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
  CREATING: 'Creating',
  FAILED: 'Failed',
};
const THREAD_STATUS_LABELS = {
  OPEN: 'ᴏᴘᴇɴ',
  REOPENED: 'ʀᴇᴏᴘᴇɴᴇᴅ',
  CLOSED: 'ᴄʟᴏꜱᴇᴅ',
};

function escapeTicketMarkdown(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/([`*_~|>#\[\]])/g, '\\$1')
    .replace(/<(@|#|@&)/g, '<\u200b$1');
}

function splitText(value, maximumLength = 3900) {
  const chunks = [];
  let remaining = String(value || '');
  while (remaining.length > maximumLength) {
    let splitAt = remaining.lastIndexOf('\n', maximumLength);
    if (splitAt < Math.floor(maximumLength / 2)) splitAt = remaining.lastIndexOf(' ', maximumLength);
    if (splitAt < Math.floor(maximumLength / 2)) splitAt = maximumLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  chunks.push(remaining);
  return chunks;
}

function discordTimestamp(value, style = 'f') {
  const timestamp = Math.floor(Date.parse(value) / 1000);
  return Number.isFinite(timestamp) ? `<t:${timestamp}:${style}>` : 'Unknown';
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return 'N/A';
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatTechnologyTicketThreadName(ticket) {
  const status = THREAD_STATUS_LABELS[ticket.status] || THREAD_STATUS_LABELS.OPEN;
  const suffix = ` | ${ticket.ticket_id}`;
  const availableTitleLength = Math.max(1, 100 - status.length - 3 - suffix.length);
  const title = [...String(ticket.title || 'Technology Support Request')]
    .slice(0, availableTitleLength)
    .join('')
    .trim();
  return `${status} | ${title}${suffix}`;
}

function buildTechnologyTicketPanelPayload() {
  const container = new ContainerBuilder()
    .setAccentColor(PANEL_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          '## Technology Help Desk',
          'Report a technology concern in one step. Your request will be placed in a private thread with the Technology and Development team.',
          '-# Describe what happened, where it happened, and any error message you saw.',
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addActionRowComponents((row) =>
      row.setComponents(
        new ButtonBuilder()
          .setCustomId('techTicket:open')
          .setLabel('Open Ticket')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('techTicket:list:active:0')
          .setLabel('View My Tickets')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('techTicket:stats:0')
          .setLabel('Ticket Statistics')
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function buildTechnologyTicketMessagePayload(ticket) {
  const status = STATUS_LABELS[ticket.status] || ticket.status;
  const container = new ContainerBuilder()
    .setAccentColor(STATUS_ACCENTS[ticket.status] || PANEL_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          `## ${ticket.ticket_id} · ${escapeTicketMarkdown(ticket.title)}`,
          `**Status:** ${status}`,
          `**Category:** ${escapeTicketMarkdown(ticket.category)}`,
          `**Requested by:** <@${ticket.requester_id}>`,
          `**Technology team:** <@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}>`,
          `**Assigned to:** ${ticket.assigned_to_id ? `<@${ticket.assigned_to_id}>` : 'Unassigned'}`,
          `**Created:** ${discordTimestamp(ticket.created_at)}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((text) => text.setContent('### Description'));

  for (const descriptionChunk of splitText(escapeTicketMarkdown(ticket.description))) {
    container.addTextDisplayComponents((text) => text.setContent(descriptionChunk));
  }

  if (ticket.first_response_at) {
    container.addTextDisplayComponents((text) =>
      text.setContent(
        `-# First staff response: ${discordTimestamp(ticket.first_response_at, 'R')} by <@${ticket.first_responder_id}>`
      )
    );
  }

  if (ticket.status === 'CLOSED') {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((text) =>
        text.setContent(
          [
            `### Resolution`,
            ticket.resolution ? escapeTicketMarkdown(ticket.resolution) : 'No resolution note was provided.',
            `-# Resolved by <@${ticket.resolved_by_id}> · ${discordTimestamp(ticket.closed_at)}`,
          ].join('\n')
        )
      );
  } else {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents((row) =>
        row.setComponents(
          new ButtonBuilder()
            .setCustomId(`techTicket:${ticket.assigned_to_id ? 'release' : 'claim'}:${ticket.ticket_id}`)
            .setLabel(ticket.assigned_to_id ? 'Release Ticket' : 'Claim Ticket')
            .setStyle(ticket.assigned_to_id ? ButtonStyle.Secondary : ButtonStyle.Success)
        )
      )
      .addActionRowComponents((row) =>
        row.setComponents(
          new StringSelectMenuBuilder()
            .setCustomId('technologyTicketCategory')
            .setPlaceholder('Change ticket category')
            .addOptions(
              TECHNOLOGY_TICKET_CATEGORIES.map((category) => ({
                label: category,
                value: category,
                default: category === ticket.category,
              }))
            )
        )
      );
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: {
      users: [ticket.requester_id, ticket.assigned_to_id, ticket.first_responder_id, ticket.resolved_by_id].filter(Boolean),
      roles: [TECHNOLOGY_DEPARTMENT_ROLE_ID],
      repliedUser: false,
    },
  };
}

function buildTechnologyTicketReopenedPayload(ticket, actorId) {
  const container = new ContainerBuilder()
    .setAccentColor(STATUS_ACCENTS.REOPENED)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          '## Ticket reopened',
          `<@${actorId}> reopened **${ticket.ticket_id}**.`,
          `<@${ticket.requester_id}> <@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}>`,
        ].join('\n')
      )
    );
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: {
      users: [actorId, ticket.requester_id],
      roles: [TECHNOLOGY_DEPARTMENT_ROLE_ID],
      repliedUser: false,
    },
  };
}

function buildTechnologyTicketClosedPayload(ticket, closedById) {
  const container = new ContainerBuilder()
    .setAccentColor(STATUS_ACCENTS.CLOSED)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          '## Ticket resolved',
          `**Ticket:** ${ticket.ticket_id}`,
          `**Closed by:** <@${closedById}>`,
          `**Resolved at:** ${discordTimestamp(ticket.closed_at)}`,
          ticket.resolution
            ? `**Resolution:** ${escapeTicketMarkdown(ticket.resolution)}`
            : 'No resolution note was provided.',
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addActionRowComponents((row) =>
      row.setComponents(
        new ButtonBuilder()
          .setCustomId(`techTicket:reopen:${ticket.ticket_id}`)
          .setLabel('Reopen Ticket')
          .setStyle(ButtonStyle.Primary)
      )
    );
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { users: [closedById], roles: [], repliedUser: false },
  };
}

function buildTechnologyTicketListPayload({ tickets, userId, guildId, filter = 'active', page = 0 }) {
  const filtered = tickets.filter((ticket) =>
    filter === 'closed' ? ticket.status === 'CLOSED' : ['OPEN', 'REOPENED'].includes(ticket.status)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.max(0, Math.min(Number(page) || 0, totalPages - 1));
  const pageTickets = filtered.slice(currentPage * 5, currentPage * 5 + 5);
  const heading = filter === 'closed' ? 'Closed tickets' : 'Open and reopened tickets';
  const container = new ContainerBuilder()
    .setAccentColor(PANEL_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(`## My Technology Tickets\n**${heading}** · Page ${currentPage + 1} of ${totalPages}`)
    );

  if (!pageTickets.length) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((text) => text.setContent('No tickets are available in this group.'));
  } else {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((text) =>
        text.setContent(
          pageTickets
            .map(
              (ticket) =>
                `**${ticket.ticket_id}** · ${escapeTicketMarkdown(ticket.title)}\n-# ${STATUS_LABELS[ticket.status]} · ${escapeTicketMarkdown(ticket.category)} · ${discordTimestamp(ticket.created_at, 'R')}`
            )
            .join('\n\n')
        )
      )
      .addActionRowComponents((row) =>
        row.setComponents(
          ...pageTickets.map((ticket) =>
            new ButtonBuilder()
              .setLabel(ticket.ticket_id)
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/channels/${guildId}/${ticket.thread_id}`)
          )
        )
      );
  }

  container
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addActionRowComponents((row) =>
      row.setComponents(
        new ButtonBuilder()
          .setCustomId(`techTicket:list:active:0:${userId}`)
          .setLabel('Open & Reopened')
          .setStyle(filter === 'active' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`techTicket:list:closed:0:${userId}`)
          .setLabel('Closed')
          .setStyle(filter === 'closed' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`techTicket:list:${filter}:${Math.max(0, currentPage - 1)}:${userId}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId(`techTicket:list:${filter}:${Math.min(totalPages - 1, currentPage + 1)}:${userId}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= totalPages - 1)
      )
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

function formatStaffRow(row, rank = null) {
  const rankLabel = rank ? `**#${rank} · <@${row.staffId}> — ${row.score.toFixed(1)}**` : `**<@${row.staffId}> · Not yet ranked**`;
  return [
    rankLabel,
    `Resolved: ${row.resolvedCount} · First responses: ${row.firstResponsesHandled}`,
    `Median response: ${formatDuration(row.medianFirstResponseMs)} · Median resolution: ${formatDuration(row.medianResolutionMs)} · Reopen rate: ${row.reopenRate == null ? 'N/A' : `${Math.round(row.reopenRate * 100)}%`}`,
  ].join('\n');
}

function buildTechnologyTicketStatisticsPayload(statistics, page = 0) {
  const ranked = statistics.leaderboard.map((row, index) => ({ ...row, rank: index + 1 }));
  const combined = [
    ...ranked.map((row) => ({ ...row, group: 'ranked' })),
    ...statistics.unranked.map((row) => ({ ...row, group: 'unranked' })),
  ];
  const totalPages = Math.max(1, Math.ceil(combined.length / 5));
  const currentPage = Math.max(0, Math.min(Number(page) || 0, totalPages - 1));
  const pageRows = combined.slice(currentPage * 5, currentPage * 5 + 5);
  const categoryText = Object.entries(statistics.categories)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => `${escapeTicketMarkdown(category)}: **${count}**`)
    .join(' · ') || 'No ticket data yet.';

  const container = new ContainerBuilder()
    .setAccentColor(PANEL_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          '## Technology Ticket Statistics',
          `**Active:** ${statistics.counts.active} · **Open:** ${statistics.counts.open} · **Reopened:** ${statistics.counts.reopened}`,
          `**Closed:** ${statistics.counts.closed} · **Total:** ${statistics.counts.total}`,
          `**Last 7 days:** ${statistics.activity.created7} created · ${statistics.activity.closed7} closed`,
          `**Last 30 days:** ${statistics.activity.created30} created · ${statistics.activity.closed30} closed`,
          `**Median resolution:** ${formatDuration(statistics.medianResolutionMs)}`,
          `**Oldest active:** ${formatDuration(statistics.oldestActiveMs)}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((text) => text.setContent(`### Categories\n${categoryText}`))
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          `### ${statistics.monthLabel} Staff Leaderboard`,
          '-# Balanced score: 30% resolved volume · 30% response speed · 30% resolution speed · 10% reopen rate',
          pageRows.length
            ? pageRows.map((row) => formatStaffRow(row, row.group === 'ranked' ? row.rank : null)).join('\n\n')
            : 'No Technology and Development staff statistics are available yet.',
          `-# Page ${currentPage + 1} of ${totalPages} · At least 3 monthly resolutions are required to rank.`,
        ].join('\n')
      )
    );

  if (totalPages > 1) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents((row) =>
        row.setComponents(
          new ButtonBuilder()
            .setCustomId(`techTicket:stats:${Math.max(0, currentPage - 1)}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`techTicket:stats:${Math.min(totalPages - 1, currentPage + 1)}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1)
        )
      );
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

function buildTechnologyTicketNoticePayload(title, detail, accentColor = PANEL_ACCENT) {
  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents((text) =>
      text.setContent([`## ${title}`, escapeTicketMarkdown(detail)].filter(Boolean).join('\n'))
    );
  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

module.exports = {
  PANEL_ACCENT,
  STATUS_ACCENTS,
  buildTechnologyTicketPanelPayload,
  buildTechnologyTicketMessagePayload,
  buildTechnologyTicketClosedPayload,
  buildTechnologyTicketReopenedPayload,
  buildTechnologyTicketListPayload,
  buildTechnologyTicketStatisticsPayload,
  buildTechnologyTicketNoticePayload,
  discordTimestamp,
  escapeTicketMarkdown,
  formatDuration,
  formatTechnologyTicketThreadName,
};
