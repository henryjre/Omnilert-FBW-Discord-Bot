const AsyncLock = require('async-lock');
const { ChannelType } = require('discord.js');
const moment = require('moment-timezone');
const {
  TECHNOLOGY_TICKET_CHANNEL_ID,
  TECHNOLOGY_DEPARTMENT_ROLE_ID,
  MANILA_TIMEZONE,
} = require('./technologyTicketConstants');
const { classifyTechnologyTicket } = require('./technologyTicketAi');
const { calculateTechnologyTicketStatistics } = require('./technologyTicketAnalytics');
const store = require('./technologyTicketStore');
const {
  buildTechnologyTicketClosedPayload,
  buildTechnologyTicketListPayload,
  buildTechnologyTicketMessagePayload,
  buildTechnologyTicketPanelPayload,
  buildTechnologyTicketReopenedPayload,
  buildTechnologyTicketStatisticsPayload,
  buildTechnologyTicketUrgentPayload,
  formatTechnologyTicketThreadName,
} = require('./technologyTicketUi');

const ticketLock = new AsyncLock();
const URGENCY_COOLDOWN_MS = 30 * 60 * 1000;
const STATISTICS_CACHE_TTL_MS = 30 * 1000;
const statisticsCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function isTechnologyStaff(member) {
  return Boolean(member?.roles?.cache?.has(TECHNOLOGY_DEPARTMENT_ROLE_ID));
}

function getTechnologyTicket(ticketId) {
  return store.getTechnologyTicketById(ticketId);
}

function invalidateTechnologyTicketStatistics(guildId) {
  if (guildId) statisticsCache.delete(guildId);
  else statisticsCache.clear();
}

async function fetchChannel(client, channelId) {
  return client.channels.cache.get(channelId) || (await client.channels.fetch(channelId));
}

async function ensureTechnologyTicketPanel(client) {
  const guildId = process.env.node_env === 'prod' ? process.env.prodGuildId : process.env.testGuildId;
  if (!guildId) throw new Error('The active guild ID is not configured.');
  const channel = await fetchChannel(client, TECHNOLOGY_TICKET_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText || !channel.isTextBased()) {
    throw new Error(`Technology ticket channel ${TECHNOLOGY_TICKET_CHANNEL_ID} is not a guild text channel.`);
  }

  const config = store.getTechnologyTicketPanelConfig(guildId);
  let panelMessage = null;
  if (config?.panel_message_id) {
    panelMessage = await channel.messages.fetch(config.panel_message_id).catch(() => null);
  }

  if (panelMessage) {
    await panelMessage.edit(buildTechnologyTicketPanelPayload());
  } else {
    panelMessage = await channel.send(buildTechnologyTicketPanelPayload());
  }

  store.saveTechnologyTicketPanelConfig({
    guildId,
    channelId: channel.id,
    panelMessageId: panelMessage.id,
    updatedAt: nowIso(),
  });
  return panelMessage;
}

async function createTechnologyTicketFromDescription({ interaction, client, description }) {
  const createdAt = nowIso();
  const year = moment.tz(createdAt, MANILA_TIMEZONE).year();
  const record = store.createTechnologyTicket({
    year,
    guildId: interaction.guildId,
    parentChannelId: TECHNOLOGY_TICKET_CHANNEL_ID,
    requesterId: interaction.user.id,
    description,
    createdAt,
  });
  let thread = null;

  try {
    const [classification, parentChannel] = await Promise.all([
      classifyTechnologyTicket(description),
      fetchChannel(client, TECHNOLOGY_TICKET_CHANNEL_ID),
    ]);
    if (!parentChannel || parentChannel.type !== ChannelType.GuildText) {
      throw new Error('The configured help-ticket channel is unavailable.');
    }

    const provisional = {
      ...record,
      title: classification.title,
      category: classification.category,
      status: 'OPEN',
    };
    thread = await parentChannel.threads.create({
      name: formatTechnologyTicketThreadName(provisional),
      autoArchiveDuration: 10080,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `${record.ticket_id} opened by ${interaction.user.tag || interaction.user.id}`,
    });
    const [, initialMessage] = await Promise.all([
      thread.members.add(interaction.user.id),
      thread.send(buildTechnologyTicketMessagePayload(provisional)),
    ]);
    const ticket = store.finalizeTechnologyTicket({
      ticketId: record.ticket_id,
      title: classification.title,
      category: classification.category,
      threadId: thread.id,
      initialMessageId: initialMessage.id,
      updatedAt: nowIso(),
    });
    if (!ticket) throw new Error('The ticket record could not be finalized.');
    invalidateTechnologyTicketStatistics(ticket.guild_id);
    return ticket;
  } catch (error) {
    store.failTechnologyTicket({ ticketId: record.ticket_id, reason: error.message, updatedAt: nowIso() });
    if (thread) {
      await thread.setLocked(true).catch(() => null);
      await thread.setArchived(true).catch(() => null);
    }
    throw Object.assign(new Error(`Ticket ${record.ticket_id} could not be created. ${error.message}`), {
      ticketId: record.ticket_id,
    });
  }
}

async function refreshTechnologyTicketMessage(client, ticket) {
  if (!ticket?.thread_id || !ticket.initial_message_id) return null;
  const thread = await fetchChannel(client, ticket.thread_id);
  const message = await thread.messages.fetch(ticket.initial_message_id);
  await message.edit(buildTechnologyTicketMessagePayload(ticket));
  return message;
}

async function refreshActiveTechnologyTicketMessages(client) {
  const activeTickets = store
    .getAllTechnologyTickets()
    .filter((ticket) => store.ACTIVE_STATUSES.includes(ticket.status));
  let refreshed = 0;

  for (const ticket of activeTickets) {
    try {
      await refreshTechnologyTicketMessage(client, ticket);
      const thread = await fetchChannel(client, ticket.thread_id);
      await thread.setName(formatTechnologyTicketThreadName(ticket));
      refreshed += 1;
    } catch (error) {
      console.error(`Failed to refresh active ticket ${ticket.ticket_id}:`, error);
    }
  }
  return { refreshed, total: activeTickets.length };
}

async function claimTechnologyTicket({ client, ticketId, staffId, project = true }) {
  return ticketLock.acquire(ticketId, async () => {
    const result = store.claimTechnologyTicket({ ticketId, staffId, updatedAt: nowIso() });
    if (project && result.outcome === 'claimed') await refreshTechnologyTicketMessage(client, result.ticket);
    return result;
  });
}

async function releaseTechnologyTicket({ client, ticketId, staffId, project = true }) {
  return ticketLock.acquire(ticketId, async () => {
    const result = store.releaseTechnologyTicket({ ticketId, staffId, updatedAt: nowIso() });
    if (project && result.outcome === 'released') await refreshTechnologyTicketMessage(client, result.ticket);
    return result;
  });
}

async function changeTechnologyTicketCategory({ client, threadId, category, staffId, project = true }) {
  const current = store.getTechnologyTicketByThreadId(threadId);
  if (!current) return null;
  return ticketLock.acquire(current.ticket_id, async () => {
    const ticket = store.changeTechnologyTicketCategory({
      ticketId: current.ticket_id,
      category,
      staffId,
      updatedAt: nowIso(),
    });
    if (ticket) {
      invalidateTechnologyTicketStatistics(ticket.guild_id);
      if (project) await refreshTechnologyTicketMessage(client, ticket);
    }
    return ticket;
  });
}

async function markTechnologyTicketUrgent({ client, ticketId, requesterId, reason, sourceMessage = null }) {
  return ticketLock.acquire(ticketId, async () => {
    const result = store.markTechnologyTicketUrgent({
      ticketId,
      requesterId,
      reason: reason.trim(),
      urgentAt: nowIso(),
      cooldownMs: URGENCY_COOLDOWN_MS,
    });
    if (result.outcome !== 'marked') return result;

    const thread = await fetchChannel(client, result.ticket.thread_id);
    const messageUpdate = sourceMessage?.edit
      ? sourceMessage.edit(buildTechnologyTicketMessagePayload(result.ticket))
      : refreshTechnologyTicketMessage(client, result.ticket);
    await Promise.all([
      messageUpdate,
      thread.setName(formatTechnologyTicketThreadName(result.ticket)),
      thread.send(buildTechnologyTicketUrgentPayload(result.ticket)),
    ]);
    return result;
  });
}

async function closeTechnologyTicket({ client, thread, actorId, resolution = null }) {
  const current = store.getTechnologyTicketByThreadId(thread.id);
  if (!current) return { outcome: 'not_ticket', ticket: null };
  return ticketLock.acquire(current.ticket_id, async () => {
    const latest = store.getTechnologyTicketById(current.ticket_id);
    if (!store.ACTIVE_STATUSES.includes(latest.status)) {
      return { outcome: 'already_closed', ticket: latest };
    }
    const ticket = store.closeTechnologyTicketRecord({
      ticketId: latest.ticket_id,
      actorId,
      resolution: resolution?.trim() || null,
      closedAt: nowIso(),
    });
    invalidateTechnologyTicketStatistics(ticket.guild_id);
    await Promise.all([
      refreshTechnologyTicketMessage(client, ticket),
      thread.setName(formatTechnologyTicketThreadName(ticket)),
    ]);
    const closureMessage = await thread.send(buildTechnologyTicketClosedPayload(ticket, actorId));
    const savedTicket = store.saveTechnologyTicketClosureMessage({
      ticketId: ticket.ticket_id,
      messageId: closureMessage.id,
      updatedAt: nowIso(),
    });
    if (!savedTicket) throw new Error(`Could not save the closure message for ${ticket.ticket_id}.`);
    await thread.edit({ locked: true, archived: true });
    return { outcome: 'closed', ticket: savedTicket };
  });
}

async function reopenTechnologyTicket({ client, ticketId, actorId }) {
  return ticketLock.acquire(ticketId, async () => {
    const latest = store.getTechnologyTicketById(ticketId);
    if (!latest) return { outcome: 'not_found', ticket: null };
    if (latest.status !== 'CLOSED') return { outcome: 'not_closed', ticket: latest };
    const thread = await fetchChannel(client, latest.thread_id);
    await thread.edit({ archived: false, locked: false });
    const ticket = store.reopenTechnologyTicketRecord({ ticketId, actorId, reopenedAt: nowIso() });
    invalidateTechnologyTicketStatistics(ticket.guild_id);

    const projections = [];
    if (latest.closure_message_id) {
      projections.push((async () => {
        const closureMessage = await thread.messages.fetch(latest.closure_message_id);
        await closureMessage.edit(
          buildTechnologyTicketClosedPayload(
            latest,
            latest.closed_by_id || latest.resolved_by_id,
            { includeReopenButton: false }
          )
        );
      })());
    }
    projections.push(
      refreshTechnologyTicketMessage(client, ticket),
      thread.setName(formatTechnologyTicketThreadName(ticket)),
      thread.send(buildTechnologyTicketReopenedPayload(ticket, actorId))
    );
    const projectionResults = await Promise.allSettled(projections);
    for (const result of projectionResults) {
      if (result.status === 'rejected' && result.reason?.code !== 10008) {
        console.error(`Failed to synchronize reopened ticket ${ticketId}:`, result.reason);
      }
    }
    return { outcome: 'reopened', ticket };
  });
}

async function recordFirstTechnologyStaffResponse(message, client) {
  if (!message?.channel?.isThread?.() || !isTechnologyStaff(message.member)) return null;
  const ticket = store.getTechnologyTicketByThreadId(message.channel.id);
  if (!ticket) return null;
  const updated = store.recordTechnologyTicketFirstResponse({
    ticketId: ticket.ticket_id,
    staffId: message.author.id,
    respondedAt: message.createdAt?.toISOString?.() || nowIso(),
  });
  if (updated) await refreshTechnologyTicketMessage(client, updated).catch((error) => {
    console.error('Failed to refresh ticket after first response:', error);
  });
  if (updated) invalidateTechnologyTicketStatistics(updated.guild_id);
  return updated;
}

function buildTechnologyTicketListForUser({ userId, guildId, filter, page }) {
  const normalizedFilter = filter === 'closed' ? 'closed' : 'active';
  const totalCount = store.countTechnologyTicketsByRequester({
    requesterId: userId,
    filter: normalizedFilter,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / 5));
  const currentPage = Math.max(0, Math.min(Number(page) || 0, totalPages - 1));
  return buildTechnologyTicketListPayload({
    tickets: store.getTechnologyTicketPageByRequester({
      requesterId: userId,
      filter: normalizedFilter,
      limit: 5,
      offset: currentPage * 5,
    }),
    userId,
    guildId,
    filter: normalizedFilter,
    page: currentPage,
    totalCount,
  });
}

async function buildTechnologyTicketStatisticsForGuild(guild, page = 0) {
  const cached = statisticsCache.get(guild.id);
  if (cached && cached.expiresAt > Date.now()) {
    return buildTechnologyTicketStatisticsPayload(cached.statistics, page);
  }
  let role = guild.roles.cache.get(TECHNOLOGY_DEPARTMENT_ROLE_ID);
  if (!role) role = await guild.roles.fetch(TECHNOLOGY_DEPARTMENT_ROLE_ID).catch(() => null);
  const staffIds = role ? [...role.members.keys()] : [];
  const statistics = calculateTechnologyTicketStatistics({
    tickets: store.getAllTechnologyTickets(),
    events: store.getTechnologyTicketEvents(),
    staffIds,
  });
  statisticsCache.set(guild.id, {
    statistics,
    expiresAt: Date.now() + STATISTICS_CACHE_TTL_MS,
  });
  return buildTechnologyTicketStatisticsPayload(statistics, page);
}

module.exports = {
  URGENCY_COOLDOWN_MS,
  STATISTICS_CACHE_TTL_MS,
  isTechnologyStaff,
  getTechnologyTicket,
  invalidateTechnologyTicketStatistics,
  ensureTechnologyTicketPanel,
  createTechnologyTicketFromDescription,
  refreshTechnologyTicketMessage,
  refreshActiveTechnologyTicketMessages,
  claimTechnologyTicket,
  releaseTechnologyTicket,
  changeTechnologyTicketCategory,
  markTechnologyTicketUrgent,
  closeTechnologyTicket,
  reopenTechnologyTicket,
  recordFirstTechnologyStaffResponse,
  buildTechnologyTicketListForUser,
  buildTechnologyTicketStatisticsForGuild,
};
