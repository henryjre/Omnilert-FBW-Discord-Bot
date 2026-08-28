const moment = require('moment-timezone');

const MANILA_TIMEZONE = 'Asia/Manila';
const LEADERBOARD_MINIMUM_RESOLUTIONS = 3;

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(value, values, higherIsBetter) {
  if (!Number.isFinite(value)) return 0;
  if (values.length <= 1) return 100;
  if (values.every((candidate) => candidate === values[0])) return 100;
  const worse = values.filter((candidate) =>
    higherIsBetter ? candidate < value : candidate > value
  ).length;
  return (worse / (values.length - 1)) * 100;
}

function calculateTechnologyTicketStatistics({ tickets, events, staffIds, now = new Date() }) {
  const currentTime = now.getTime();
  const sevenDaysAgo = currentTime - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = currentTime - 30 * 24 * 60 * 60 * 1000;
  const monthStart = moment.tz(now, MANILA_TIMEZONE).startOf('month').utc().valueOf();
  const monthEnd = moment.tz(now, MANILA_TIMEZONE).add(1, 'month').startOf('month').utc().valueOf();
  const validTickets = tickets.filter((ticket) => ['OPEN', 'REOPENED', 'CLOSED'].includes(ticket.status));
  const ticketById = new Map(validTickets.map((ticket) => [ticket.ticket_id, ticket]));
  const closeEvents = events.filter((event) => event.event_type === 'CLOSED');

  const counts = {
    open: validTickets.filter((ticket) => ticket.status === 'OPEN').length,
    reopened: validTickets.filter((ticket) => ticket.status === 'REOPENED').length,
    closed: validTickets.filter((ticket) => ticket.status === 'CLOSED').length,
    total: validTickets.length,
  };
  counts.active = counts.open + counts.reopened;

  const created7 = validTickets.filter((ticket) => Date.parse(ticket.created_at) >= sevenDaysAgo).length;
  const created30 = validTickets.filter((ticket) => Date.parse(ticket.created_at) >= thirtyDaysAgo).length;
  const latestCloseByTicket = new Map();
  for (const event of closeEvents) latestCloseByTicket.set(event.ticket_id, event);
  const latestCloseEvents = [...latestCloseByTicket.values()];
  const closed7 = latestCloseEvents.filter((event) => Date.parse(event.created_at) >= sevenDaysAgo).length;
  const closed30 = latestCloseEvents.filter((event) => Date.parse(event.created_at) >= thirtyDaysAgo).length;
  const medianResolutionMs = median(
    latestCloseEvents.map((event) => Number(event.metadata?.durationMs))
  );
  const activeTickets = validTickets.filter((ticket) => ['OPEN', 'REOPENED'].includes(ticket.status));
  const oldestActiveMs = activeTickets.length
    ? currentTime - Math.min(...activeTickets.map((ticket) => Date.parse(ticket.created_at)))
    : null;

  const categories = {};
  for (const ticket of validTickets) {
    categories[ticket.category] = (categories[ticket.category] || 0) + 1;
  }

  const currentStaffIds = new Set(staffIds);
  const staff = new Map(
    staffIds.map((staffId) => [
      staffId,
      {
        staffId,
        resolvedCount: 0,
        firstResponsesHandled: 0,
        responseDurations: [],
        resolutionDurations: [],
        reopenedCount: 0,
      },
    ])
  );

  const monthEvents = events.filter((event) => {
    const timestamp = Date.parse(event.created_at);
    return timestamp >= monthStart && timestamp < monthEnd;
  });

  for (const event of monthEvents) {
    if (event.event_type !== 'FIRST_RESPONSE' || !currentStaffIds.has(event.actor_id)) continue;
    const row = staff.get(event.actor_id);
    row.firstResponsesHandled += 1;
    const durationMs = Number(event.metadata?.durationMs);
    if (Number.isFinite(durationMs)) row.responseDurations.push(durationMs);
  }

  const latestMonthlyCloseByTicket = new Map();
  for (const event of monthEvents) {
    if (event.event_type === 'CLOSED') latestMonthlyCloseByTicket.set(event.ticket_id, event);
  }

  for (const event of latestMonthlyCloseByTicket.values()) {
    const staffId = event.credited_staff_id;
    if (!currentStaffIds.has(staffId)) continue;
    const row = staff.get(staffId);
    row.resolvedCount += 1;
    const durationMs = Number(event.metadata?.durationMs);
    if (Number.isFinite(durationMs)) row.resolutionDurations.push(durationMs);

    const closeTime = Date.parse(event.created_at);
    const subsequentlyReopened = events.some(
      (candidate) =>
        candidate.ticket_id === event.ticket_id &&
        candidate.event_type === 'REOPENED' &&
        Date.parse(candidate.created_at) > closeTime
    );
    if (subsequentlyReopened) row.reopenedCount += 1;
  }

  const staffRows = [...staff.values()].map((row) => ({
    staffId: row.staffId,
    resolvedCount: row.resolvedCount,
    firstResponsesHandled: row.firstResponsesHandled,
    medianFirstResponseMs: median(row.responseDurations),
    medianResolutionMs: median(row.resolutionDurations),
    reopenRate: row.resolvedCount ? row.reopenedCount / row.resolvedCount : null,
    eligible: row.resolvedCount >= LEADERBOARD_MINIMUM_RESOLUTIONS,
    score: null,
  }));

  const eligibleRows = staffRows.filter((row) => row.eligible);
  const resolvedValues = eligibleRows.map((row) => row.resolvedCount);
  const responseValues = eligibleRows
    .map((row) => row.medianFirstResponseMs)
    .filter(Number.isFinite);
  const resolutionValues = eligibleRows
    .map((row) => row.medianResolutionMs)
    .filter(Number.isFinite);
  const reopenValues = eligibleRows.map((row) => row.reopenRate ?? 1);

  for (const row of eligibleRows) {
    const volumeScore = percentile(row.resolvedCount, resolvedValues, true);
    const responseScore = Number.isFinite(row.medianFirstResponseMs)
      ? percentile(row.medianFirstResponseMs, responseValues, false)
      : 0;
    const resolutionScore = Number.isFinite(row.medianResolutionMs)
      ? percentile(row.medianResolutionMs, resolutionValues, false)
      : 0;
    const qualityScore = percentile(row.reopenRate ?? 1, reopenValues, false);
    row.score = Math.round(
      (volumeScore * 0.3 + responseScore * 0.3 + resolutionScore * 0.3 + qualityScore * 0.1) * 10
    ) / 10;
  }

  eligibleRows.sort(
    (a, b) =>
      b.score - a.score ||
      b.resolvedCount - a.resolvedCount ||
      (a.medianResolutionMs ?? Infinity) - (b.medianResolutionMs ?? Infinity) ||
      a.staffId.localeCompare(b.staffId)
  );
  const unrankedRows = staffRows
    .filter((row) => !row.eligible)
    .sort((a, b) => b.resolvedCount - a.resolvedCount || a.staffId.localeCompare(b.staffId));

  return {
    counts,
    activity: { created7, created30, closed7, closed30 },
    medianResolutionMs,
    oldestActiveMs,
    categories,
    leaderboard: eligibleRows,
    unranked: unrankedRows,
    monthLabel: moment.tz(now, MANILA_TIMEZONE).format('MMMM YYYY'),
    ticketById,
  };
}

module.exports = {
  LEADERBOARD_MINIMUM_RESOLUTIONS,
  calculateTechnologyTicketStatistics,
  median,
  percentile,
};
