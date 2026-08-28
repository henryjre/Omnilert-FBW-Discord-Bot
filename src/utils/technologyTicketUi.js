const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  SectionBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { TECHNOLOGY_TICKET_CATEGORIES } = require('./technologyTicketAi');
const { TECHNOLOGY_DEPARTMENT_ROLE_ID } = require('./technologyTicketConstants');

const PANEL_ACCENT = 0x2b6f77;
const STAFF_ACCENT = 0xc49235;
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
const STATUS_ICONS = {
  OPEN: '🟦',
  REOPENED: '🟨',
  CLOSED: '✅',
  CREATING: '⏳',
  FAILED: '❌',
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

function uniqueMentionIds(...ids) {
  return [...new Set(ids.filter(Boolean))];
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
  const statusLabel = THREAD_STATUS_LABELS[ticket.status] || THREAD_STATUS_LABELS.OPEN;
  const isActiveUrgent = ticket.is_urgent && ['OPEN', 'REOPENED'].includes(ticket.status);
  const status = isActiveUrgent ? `🚨 ${statusLabel}` : statusLabel;
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
          '## 🎫 Technology Help Desk',
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
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('techTicket:list:active:0')
          .setLabel('View My Tickets')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('techTicket:stats:0')
          .setLabel('Ticket Statistics')
          .setEmoji('📊')
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function buildTechnologyTicketMessagePayload(ticket) {
  const status = STATUS_LABELS[ticket.status] || ticket.status;
  const urgencyState = ticket.is_urgent ? ' · **🚨 URGENT**' : '';
  const container = new ContainerBuilder()
    .setAccentColor(STATUS_ACCENTS[ticket.status] || PANEL_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          `## ${STATUS_ICONS[ticket.status] || '🎫'} ${escapeTicketMarkdown(ticket.title)}`,
          `\`${ticket.ticket_id}\` · **${status.toUpperCase()}** · ${escapeTicketMarkdown(ticket.category)}${urgencyState}`,
          '',
          `**Requester** · <@${ticket.requester_id}>`,
          `**Technology team** · <@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}>`,
          `-# Opened ${discordTimestamp(ticket.created_at)}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((text) => text.setContent('### 📝 Request details'));

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

  if (ticket.is_urgent && ticket.urgency_reason) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((text) =>
        text.setContent(
          [
            '### 🚨 Urgent request',
            escapeTicketMarkdown(ticket.urgency_reason),
            `-# Escalated ${discordTimestamp(ticket.urgent_at, 'R')}`,
          ].join('\n')
        )
      );
  }

  if (ticket.status === 'CLOSED') {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((text) =>
        text.setContent(
          [
            `### ✅ Resolution`,
            ticket.resolution ? escapeTicketMarkdown(ticket.resolution) : 'No resolution note was provided.',
            `-# Resolved by <@${ticket.resolved_by_id}> · ${discordTimestamp(ticket.closed_at)}`,
          ].join('\n')
        )
      );
  } else {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent(
              [
                ticket.is_urgent ? '### 🚨 Urgent escalation' : '### Need immediate attention?',
                ticket.is_urgent
                  ? '-# You may remind the team after the 30-minute cooldown.'
                  : '-# Use this only when the issue needs immediate attention or resolution.',
              ].join('\n')
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(`techTicket:urgent:${ticket.ticket_id}`)
              .setLabel(ticket.is_urgent ? 'Send Reminder' : 'Mark as Urgent')
              .setEmoji('🚨')
              .setStyle(ButtonStyle.Danger)
          )
      )
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents((text) =>
            text.setContent(
              [
                '### 🛠️ Staff controls',
                `**Owner** · ${ticket.assigned_to_id ? `<@${ticket.assigned_to_id}>` : 'Unassigned'}`,
                ticket.assigned_to_id
                  ? '-# The current owner can release this ticket.'
                  : '-# Technology staff can claim responsibility for this request.',
              ].join('\n')
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(`techTicket:${ticket.assigned_to_id ? 'release' : 'claim'}:${ticket.ticket_id}`)
              .setLabel(ticket.assigned_to_id ? 'Release' : 'Claim')
              .setEmoji(ticket.assigned_to_id ? '↩️' : '🙋')
              .setStyle(ticket.assigned_to_id ? ButtonStyle.Secondary : ButtonStyle.Success)
          )
      )
      .addTextDisplayComponents((text) =>
        text.setContent('-# Correct the automatically selected category when needed.')
      )
      .addActionRowComponents((row) =>
        row.setComponents(
          new StringSelectMenuBuilder()
            .setCustomId('technologyTicketCategory')
            .setPlaceholder('Change category')
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
      users: uniqueMentionIds(
        ticket.requester_id,
        ticket.assigned_to_id,
        ticket.first_responder_id,
        ticket.resolved_by_id
      ),
      roles: [TECHNOLOGY_DEPARTMENT_ROLE_ID],
      repliedUser: false,
    },
  };
}

function buildTechnologyTicketUrgentPayload(ticket) {
  const container = new ContainerBuilder()
    .setAccentColor(0xd83c3e)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          '## 🚨 Urgent ticket escalation',
          `<@${ticket.requester_id}> marked **${ticket.ticket_id}** as urgent.`,
          `**Reason** · ${escapeTicketMarkdown(ticket.urgency_reason)}`,
          `<@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}>`,
          '-# Please review this request as soon as possible.',
        ].join('\n')
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: {
      users: uniqueMentionIds(ticket.requester_id),
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
          '## 🔄 Ticket reopened',
          `<@${actorId}> reopened **${ticket.ticket_id}**.`,
          `<@${ticket.requester_id}> <@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}>`,
        ].join('\n')
      )
    );
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: {
      users: uniqueMentionIds(actorId, ticket.requester_id),
      roles: [TECHNOLOGY_DEPARTMENT_ROLE_ID],
      repliedUser: false,
    },
  };
}

function buildTechnologyTicketClosedPayload(ticket, closedById, { includeReopenButton = true } = {}) {
  const container = new ContainerBuilder()
    .setAccentColor(STATUS_ACCENTS.CLOSED)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          '## ✅ Ticket resolved',
          `<@${ticket.requester_id}>, your Technology ticket has been resolved.`,
          `**Ticket:** ${ticket.ticket_id}`,
          `**Closed by:** <@${closedById}>`,
          `**Resolved at:** ${discordTimestamp(ticket.closed_at)}`,
          ticket.resolution
            ? `**Resolution:** ${escapeTicketMarkdown(ticket.resolution)}`
            : 'No resolution note was provided.',
        ].join('\n')
      )
    );

  if (includeReopenButton) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents((row) =>
        row.setComponents(
          new ButtonBuilder()
            .setCustomId(`techTicket:reopen:${ticket.ticket_id}`)
            .setLabel('Reopen Ticket')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary)
        )
      );
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: {
      users: uniqueMentionIds(ticket.requester_id, closedById),
      roles: [],
      repliedUser: false,
    },
  };
}

function buildTechnologyTicketListPayload({ tickets, userId, guildId, filter = 'active', page = 0, totalCount = null }) {
  const isPaginated = Number.isInteger(totalCount);
  const filtered = isPaginated
    ? tickets
    : tickets.filter((ticket) =>
      filter === 'closed' ? ticket.status === 'CLOSED' : ['OPEN', 'REOPENED'].includes(ticket.status)
    );
  const totalPages = Math.max(1, Math.ceil((isPaginated ? totalCount : filtered.length) / 5));
  const currentPage = Math.max(0, Math.min(Number(page) || 0, totalPages - 1));
  const pageTickets = isPaginated ? filtered : filtered.slice(currentPage * 5, currentPage * 5 + 5);
  const heading = filter === 'closed' ? 'Closed tickets' : 'Open and reopened tickets';
  const container = new ContainerBuilder()
    .setAccentColor(PANEL_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(`## 📋 My Technology Tickets\n**${heading}** · Page ${currentPage + 1} of ${totalPages}`)
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
                `${STATUS_ICONS[ticket.status] || '🎫'} **${ticket.ticket_id}** · ${escapeTicketMarkdown(ticket.title)}\n-# ${STATUS_LABELS[ticket.status]} · ${escapeTicketMarkdown(ticket.category)} · ${discordTimestamp(ticket.created_at, 'R')}`
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
          .setCustomId(`techTicket:list:active:0:${userId}:filter`)
          .setLabel('Open & Reopened')
          .setEmoji('🟦')
          .setStyle(filter === 'active' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`techTicket:list:closed:0:${userId}:filter`)
          .setLabel('Closed')
          .setEmoji('✅')
          .setStyle(filter === 'closed' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`techTicket:list:${filter}:${Math.max(0, currentPage - 1)}:${userId}:previous`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId(`techTicket:list:${filter}:${Math.min(totalPages - 1, currentPage + 1)}:${userId}:next`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= totalPages - 1)
      )
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

function formatStaffRow(row, rank = null) {
  const rankMarks = ['🥇', '🥈', '🥉'];
  const rankLabel = rank
    ? `### ${rankMarks[rank - 1] || `#${rank}`} <@${row.staffId}> · ${row.score.toFixed(1)} points`
    : `### <@${row.staffId}> · Building eligibility`;
  const resolvedLabel = rank
    ? `Resolved **${row.resolvedCount}**`
    : `Resolved **${row.resolvedCount} of 3 required**`;
  return [
    rankLabel,
    `${resolvedLabel} · First responses **${row.firstResponsesHandled}**`,
    `-# Median response ${formatDuration(row.medianFirstResponseMs)} · Resolution ${formatDuration(row.medianResolutionMs)} · Reopen rate ${row.reopenRate == null ? 'N/A' : `${Math.round(row.reopenRate * 100)}%`}`,
  ].join('\n');
}

function buildTechnologyTicketStatisticsPayload(statistics, page = 0) {
  const ranked = statistics.leaderboard.map((row, index) => ({ ...row, rank: index + 1 }));
  const activeUnranked = statistics.unranked.filter(
    (row) => row.resolvedCount > 0 || row.firstResponsesHandled > 0
  );
  const combined = [
    ...ranked.map((row) => ({ ...row, group: 'ranked' })),
    ...activeUnranked.map((row) => ({ ...row, group: 'unranked' })),
  ];
  const totalPages = Math.max(1, Math.ceil(combined.length / 5));
  const currentPage = Math.max(0, Math.min(Number(page) || 0, totalPages - 1));
  const pageRows = combined.slice(currentPage * 5, currentPage * 5 + 5);
  const categoryText = Object.entries(statistics.categories)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => `- **${escapeTicketMarkdown(category)}** — ${count}`)
    .join('\n');

  const overview = new ContainerBuilder()
    .setAccentColor(PANEL_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          '## 📊 Technology Help Desk · Service Overview',
          '-# Live workload and service health for Technology and Development.',
          '### Queue board',
          `\`OPEN ${statistics.counts.open}\` · \`REOPENED ${statistics.counts.reopened}\` · \`CLOSED ${statistics.counts.closed}\``,
          `**${statistics.counts.active} active** · ${statistics.counts.total} tickets recorded`,
        ].join('\n')
      )
    );

  if (statistics.counts.total === 0) {
    overview
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((text) =>
        text.setContent(
          [
            '### No ticket history yet',
            'Open the first help ticket to begin measuring response time, resolution pace, and service demand.',
          ].join('\n')
        )
      );
  } else {
    overview
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((text) =>
        text.setContent(
          [
            '### Recent workload',
            `**Last 7 days** · ${statistics.activity.created7} opened · ${statistics.activity.closed7} resolved`,
            `**Last 30 days** · ${statistics.activity.created30} opened · ${statistics.activity.closed30} resolved`,
            '',
            '### Service pace',
            `**Median resolution** · ${formatDuration(statistics.medianResolutionMs)}`,
            `**Oldest active ticket** · ${formatDuration(statistics.oldestActiveMs)}`,
          ].join('\n')
        )
      );

    if (categoryText) {
      overview
        .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents((text) => text.setContent(`### Demand by category\n${categoryText}`));
    }
  }

  const staff = new ContainerBuilder()
    .setAccentColor(STAFF_ACCENT)
    .addTextDisplayComponents((text) =>
      text.setContent(
        [
          `## 🏅 Staff Performance · ${statistics.monthLabel}`,
          '-# Score: 30% resolved volume · 30% response speed · 30% resolution speed · 10% low reopen rate',
          pageRows.length
            ? pageRows
              .map((row) => formatStaffRow(row, row.group === 'ranked' ? row.rank : null))
              .join('\n\n')
            : [
              '### No handling activity yet',
              'Staff metrics appear after the first staff response or resolved ticket this month.',
            ].join('\n'),
          pageRows.length
            ? `-# Page ${currentPage + 1} of ${totalPages} · Three monthly resolutions are required for a ranked score.`
            : '-# Three monthly resolutions are required for a ranked score.',
        ].join('\n')
      )
    );

  if (totalPages > 1) {
    staff
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

  return {
    components: [overview, staff],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    allowedMentions: { users: [], roles: [], repliedUser: false },
  };
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
  buildTechnologyTicketUrgentPayload,
  buildTechnologyTicketListPayload,
  buildTechnologyTicketStatisticsPayload,
  buildTechnologyTicketNoticePayload,
  discordTimestamp,
  escapeTicketMarkdown,
  formatDuration,
  formatTechnologyTicketThreadName,
};
