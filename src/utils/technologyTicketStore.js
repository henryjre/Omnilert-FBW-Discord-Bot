const db = require('../sqliteConnection');

const DEFAULT_TITLE = 'Technology Support Request';
const DEFAULT_CATEGORY = 'Other';
const ACTIVE_STATUSES = ['OPEN', 'REOPENED'];

function parseMetadata(value) {
  try {
    return JSON.parse(value || '{}');
  } catch (_) {
    return {};
  }
}

function insertEvent({
  ticketId,
  eventType,
  actorId = null,
  creditedStaffId = null,
  metadata = {},
  createdAt,
}) {
  db.prepare(
    `
      INSERT INTO technology_ticket_events
        (ticket_id, event_type, actor_id, credited_staff_id, metadata, created_at)
      VALUES
        (@ticket_id, @event_type, @actor_id, @credited_staff_id, @metadata, @created_at)
    `
  ).run({
    ticket_id: ticketId,
    event_type: eventType,
    actor_id: actorId,
    credited_staff_id: creditedStaffId,
    metadata: JSON.stringify(metadata),
    created_at: createdAt,
  });
}

const createTechnologyTicket = db.transaction(
  ({ year, guildId, parentChannelId, requesterId, description, createdAt }) => {
    const counter = db
      .prepare(
        `
          INSERT INTO technology_ticket_counters(year, last_number)
          VALUES (?, 1)
          ON CONFLICT(year) DO UPDATE
            SET last_number = technology_ticket_counters.last_number + 1
          RETURNING last_number
        `
      )
      .get(year);

    const sequenceNumber = counter.last_number;
    const ticketId = `TDD${year}${String(sequenceNumber).padStart(4, '0')}`;

    db.prepare(
      `
        INSERT INTO technology_tickets (
          ticket_id, sequence_year, sequence_number, guild_id, parent_channel_id,
          requester_id, title, description, category, status, created_at, updated_at
        ) VALUES (
          @ticket_id, @sequence_year, @sequence_number, @guild_id, @parent_channel_id,
          @requester_id, @title, @description, @category, 'CREATING', @created_at, @updated_at
        )
      `
    ).run({
      ticket_id: ticketId,
      sequence_year: year,
      sequence_number: sequenceNumber,
      guild_id: guildId,
      parent_channel_id: parentChannelId,
      requester_id: requesterId,
      title: DEFAULT_TITLE,
      description,
      category: DEFAULT_CATEGORY,
      created_at: createdAt,
      updated_at: createdAt,
    });

    insertEvent({
      ticketId,
      eventType: 'CREATED',
      actorId: requesterId,
      metadata: { status: 'CREATING' },
      createdAt,
    });

    return getTechnologyTicketById(ticketId);
  }
);

const finalizeTechnologyTicket = db.transaction(
  ({ ticketId, title, category, threadId, initialMessageId, updatedAt }) => {
    const result = db
      .prepare(
        `
          UPDATE technology_tickets
          SET title = @title,
              category = @category,
              thread_id = @thread_id,
              initial_message_id = @initial_message_id,
              status = 'OPEN',
              updated_at = @updated_at
          WHERE ticket_id = @ticket_id AND status = 'CREATING'
        `
      )
      .run({
        ticket_id: ticketId,
        title,
        category,
        thread_id: threadId,
        initial_message_id: initialMessageId,
        updated_at: updatedAt,
      });

    if (!result.changes) return null;
    insertEvent({
      ticketId,
      eventType: 'OPENED',
      metadata: { title, category, threadId },
      createdAt: updatedAt,
    });
    return getTechnologyTicketById(ticketId);
  }
);

const failTechnologyTicket = db.transaction(({ ticketId, reason, updatedAt }) => {
  db.prepare(
    `
      UPDATE technology_tickets
      SET status = 'FAILED', failed_reason = @reason, updated_at = @updated_at
      WHERE ticket_id = @ticket_id
    `
  ).run({ ticket_id: ticketId, reason: String(reason || '').slice(0, 1000), updated_at: updatedAt });

  insertEvent({
    ticketId,
    eventType: 'FAILED',
    metadata: { reason: String(reason || '').slice(0, 1000) },
    createdAt: updatedAt,
  });
  return getTechnologyTicketById(ticketId);
});

function getTechnologyTicketById(ticketId) {
  return db.prepare('SELECT * FROM technology_tickets WHERE ticket_id = ?').get(ticketId) || null;
}

function getTechnologyTicketByThreadId(threadId) {
  return db.prepare('SELECT * FROM technology_tickets WHERE thread_id = ?').get(threadId) || null;
}

function getTechnologyTicketsByRequester(requesterId) {
  return db
    .prepare(
      `
        SELECT * FROM technology_tickets
        WHERE requester_id = ? AND status IN ('OPEN', 'REOPENED', 'CLOSED')
        ORDER BY created_at DESC
      `
    )
    .all(requesterId);
}

const claimTechnologyTicket = db.transaction(({ ticketId, staffId, updatedAt }) => {
  const ticket = getTechnologyTicketById(ticketId);
  if (!ticket || !ACTIVE_STATUSES.includes(ticket.status)) return { outcome: 'inactive', ticket };
  if (ticket.assigned_to_id) {
    return {
      outcome: ticket.assigned_to_id === staffId ? 'already_assigned_to_you' : 'already_assigned',
      ticket,
    };
  }

  db.prepare(
    `UPDATE technology_tickets SET assigned_to_id = ?, updated_at = ? WHERE ticket_id = ?`
  ).run(staffId, updatedAt, ticketId);
  insertEvent({ ticketId, eventType: 'CLAIMED', actorId: staffId, createdAt: updatedAt });
  return { outcome: 'claimed', ticket: getTechnologyTicketById(ticketId) };
});

const releaseTechnologyTicket = db.transaction(({ ticketId, staffId, updatedAt }) => {
  const ticket = getTechnologyTicketById(ticketId);
  if (!ticket || !ACTIVE_STATUSES.includes(ticket.status)) return { outcome: 'inactive', ticket };
  if (!ticket.assigned_to_id) return { outcome: 'unassigned', ticket };
  if (ticket.assigned_to_id !== staffId) return { outcome: 'not_assignee', ticket };

  db.prepare(
    `UPDATE technology_tickets SET assigned_to_id = NULL, updated_at = ? WHERE ticket_id = ?`
  ).run(updatedAt, ticketId);
  insertEvent({ ticketId, eventType: 'RELEASED', actorId: staffId, createdAt: updatedAt });
  return { outcome: 'released', ticket: getTechnologyTicketById(ticketId) };
});

const changeTechnologyTicketCategory = db.transaction(
  ({ ticketId, category, staffId, updatedAt }) => {
    const ticket = getTechnologyTicketById(ticketId);
    if (!ticket || !['OPEN', 'REOPENED', 'CLOSED'].includes(ticket.status)) return null;
    const oldCategory = ticket.category;
    db.prepare(
      `UPDATE technology_tickets SET category = ?, updated_at = ? WHERE ticket_id = ?`
    ).run(category, updatedAt, ticketId);
    insertEvent({
      ticketId,
      eventType: 'CATEGORY_CHANGED',
      actorId: staffId,
      metadata: { oldCategory, category },
      createdAt: updatedAt,
    });
    return getTechnologyTicketById(ticketId);
  }
);

const markTechnologyTicketUrgent = db.transaction(
  ({ ticketId, requesterId, reason, urgentAt, cooldownMs }) => {
    const ticket = getTechnologyTicketById(ticketId);
    if (!ticket) return { outcome: 'not_found', ticket: null };
    if (!ACTIVE_STATUSES.includes(ticket.status)) return { outcome: 'inactive', ticket };
    if (ticket.requester_id !== requesterId) return { outcome: 'not_requester', ticket };

    const previousUrgentAt = Date.parse(ticket.urgent_at);
    const nextAllowedAt = previousUrgentAt + cooldownMs;
    if (Number.isFinite(previousUrgentAt) && Date.parse(urgentAt) < nextAllowedAt) {
      return { outcome: 'cooldown', ticket, nextAllowedAt: new Date(nextAllowedAt).toISOString() };
    }

    db.prepare(
      `
        UPDATE technology_tickets
        SET is_urgent = 1,
            urgency_reason = @reason,
            urgent_at = @urgent_at,
            urgent_by_id = @requester_id,
            urgency_count = urgency_count + 1,
            updated_at = @urgent_at
        WHERE ticket_id = @ticket_id
      `
    ).run({ ticket_id: ticketId, requester_id: requesterId, reason, urgent_at: urgentAt });

    const updated = getTechnologyTicketById(ticketId);
    insertEvent({
      ticketId,
      eventType: 'MARKED_URGENT',
      actorId: requesterId,
      metadata: { reason, urgencyCount: updated.urgency_count },
      createdAt: urgentAt,
    });
    return { outcome: 'marked', ticket: updated };
  }
);

const closeTechnologyTicketRecord = db.transaction(
  ({ ticketId, actorId, resolution = null, closedAt }) => {
    const ticket = getTechnologyTicketById(ticketId);
    if (!ticket || !ACTIVE_STATUSES.includes(ticket.status)) return null;
    const creditedStaffId = ticket.assigned_to_id || actorId;
    const durationMs = Math.max(0, Date.parse(closedAt) - Date.parse(ticket.created_at));

    db.prepare(
      `
        UPDATE technology_tickets
        SET status = 'CLOSED', resolved_by_id = @resolved_by_id,
            closed_by_id = @closed_by_id, resolution = @resolution,
            closed_at = @closed_at, is_urgent = 0,
            updated_at = @closed_at
        WHERE ticket_id = @ticket_id
      `
    ).run({
      ticket_id: ticketId,
      resolved_by_id: creditedStaffId,
      closed_by_id: actorId,
      resolution,
      closed_at: closedAt,
    });

    insertEvent({
      ticketId,
      eventType: 'CLOSED',
      actorId,
      creditedStaffId,
      metadata: { durationMs, resolution: resolution || null },
      createdAt: closedAt,
    });
    return getTechnologyTicketById(ticketId);
  }
);

function saveTechnologyTicketClosureMessage({ ticketId, messageId, updatedAt }) {
  const result = db.prepare(
    `
      UPDATE technology_tickets
      SET closure_message_id = ?, updated_at = ?
      WHERE ticket_id = ? AND status = 'CLOSED'
    `
  ).run(messageId, updatedAt, ticketId);
  return result.changes ? getTechnologyTicketById(ticketId) : null;
}

const reopenTechnologyTicketRecord = db.transaction(({ ticketId, actorId, reopenedAt }) => {
  const ticket = getTechnologyTicketById(ticketId);
  if (!ticket || ticket.status !== 'CLOSED') return null;

  db.prepare(
    `
      UPDATE technology_tickets
      SET status = 'REOPENED', reopened_at = @reopened_at,
          reopen_count = reopen_count + 1, closure_message_id = NULL,
          updated_at = @reopened_at
      WHERE ticket_id = @ticket_id
    `
  ).run({ ticket_id: ticketId, reopened_at: reopenedAt });
  insertEvent({ ticketId, eventType: 'REOPENED', actorId, createdAt: reopenedAt });
  return getTechnologyTicketById(ticketId);
});

const recordTechnologyTicketFirstResponse = db.transaction(
  ({ ticketId, staffId, respondedAt }) => {
    const ticket = getTechnologyTicketById(ticketId);
    if (!ticket || !ACTIVE_STATUSES.includes(ticket.status) || ticket.first_response_at) return null;
    const durationMs = Math.max(0, Date.parse(respondedAt) - Date.parse(ticket.created_at));
    const result = db
      .prepare(
        `
          UPDATE technology_tickets
          SET first_response_at = @responded_at,
              first_responder_id = @staff_id,
              updated_at = @responded_at
          WHERE ticket_id = @ticket_id AND first_response_at IS NULL
        `
      )
      .run({ ticket_id: ticketId, staff_id: staffId, responded_at: respondedAt });
    if (!result.changes) return null;
    insertEvent({
      ticketId,
      eventType: 'FIRST_RESPONSE',
      actorId: staffId,
      metadata: { durationMs },
      createdAt: respondedAt,
    });
    return getTechnologyTicketById(ticketId);
  }
);

function getTechnologyTicketEvents() {
  return db
    .prepare('SELECT * FROM technology_ticket_events ORDER BY created_at ASC, id ASC')
    .all()
    .map((event) => ({ ...event, metadata: parseMetadata(event.metadata) }));
}

function getAllTechnologyTickets() {
  return db
    .prepare(
      `SELECT * FROM technology_tickets WHERE status IN ('OPEN', 'REOPENED', 'CLOSED') ORDER BY created_at ASC`
    )
    .all();
}

function getTechnologyTicketPanelConfig(guildId) {
  return db.prepare('SELECT * FROM technology_ticket_config WHERE guild_id = ?').get(guildId) || null;
}

const saveTechnologyTicketPanelConfig = db.transaction(
  ({ guildId, channelId, panelMessageId, updatedAt }) => {
    db.prepare(
      `
        INSERT INTO technology_ticket_config(guild_id, channel_id, panel_message_id, updated_at)
        VALUES (@guild_id, @channel_id, @panel_message_id, @updated_at)
        ON CONFLICT(guild_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          panel_message_id = excluded.panel_message_id,
          updated_at = excluded.updated_at
      `
    ).run({
      guild_id: guildId,
      channel_id: channelId,
      panel_message_id: panelMessageId,
      updated_at: updatedAt,
    });
    return getTechnologyTicketPanelConfig(guildId);
  }
);

module.exports = {
  ACTIVE_STATUSES,
  createTechnologyTicket,
  finalizeTechnologyTicket,
  failTechnologyTicket,
  getTechnologyTicketById,
  getTechnologyTicketByThreadId,
  getTechnologyTicketsByRequester,
  claimTechnologyTicket,
  releaseTechnologyTicket,
  changeTechnologyTicketCategory,
  markTechnologyTicketUrgent,
  closeTechnologyTicketRecord,
  saveTechnologyTicketClosureMessage,
  reopenTechnologyTicketRecord,
  recordTechnologyTicketFirstResponse,
  getTechnologyTicketEvents,
  getAllTechnologyTickets,
  getTechnologyTicketPanelConfig,
  saveTechnologyTicketPanelConfig,
};
