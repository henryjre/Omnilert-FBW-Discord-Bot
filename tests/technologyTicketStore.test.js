const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('persists an atomic ticket lifecycle and annual counters', () => {
  const originalCwd = process.cwd();
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'technology-ticket-store-'));
  fs.mkdirSync(path.join(temporaryRoot, 'src'));
  process.chdir(temporaryRoot);

  const connectionPath = path.join(originalCwd, 'src', 'sqliteConnection.js');
  const storePath = path.join(originalCwd, 'src', 'utils', 'technologyTicketStore.js');
  delete require.cache[require.resolve(connectionPath)];
  delete require.cache[require.resolve(storePath)];
  const store = require(storePath);
  const db = require(connectionPath);

  try {
    const base = {
      guildId: 'guild',
      parentChannelId: 'parent',
      requesterId: 'requester',
      description: 'Printer is offline',
      createdAt: '2026-08-28T00:00:00.000Z',
    };
    const first = store.createTechnologyTicket({ ...base, year: 2026 });
    const second = store.createTechnologyTicket({ ...base, year: 2026 });
    const nextYear = store.createTechnologyTicket({ ...base, year: 2027 });
    assert.equal(first.ticket_id, 'TDD20260001');
    assert.equal(second.ticket_id, 'TDD20260002');
    assert.equal(nextYear.ticket_id, 'TDD20270001');

    let ticket = store.finalizeTechnologyTicket({
      ticketId: first.ticket_id,
      title: 'Printer Offline',
      category: 'Hardware',
      threadId: 'thread',
      initialMessageId: 'message',
      updatedAt: '2026-08-28T00:01:00.000Z',
    });
    assert.equal(ticket.status, 'OPEN');
    assert.equal(
      store.countTechnologyTicketsByRequester({ requesterId: 'requester', filter: 'active' }),
      1
    );
    assert.deepEqual(
      store.getTechnologyTicketPageByRequester({
        requesterId: 'requester',
        filter: 'active',
        limit: 5,
        offset: 0,
      }).map((row) => row.ticket_id),
      [ticket.ticket_id]
    );
    assert.equal(store.claimTechnologyTicket({ ticketId: ticket.ticket_id, staffId: 'staff', updatedAt: '2026-08-28T00:02:00.000Z' }).outcome, 'claimed');
    assert.equal(store.releaseTechnologyTicket({ ticketId: ticket.ticket_id, staffId: 'other-staff', updatedAt: '2026-08-28T00:02:10.000Z' }).outcome, 'not_assignee');
    assert.equal(store.releaseTechnologyTicket({ ticketId: ticket.ticket_id, staffId: 'staff', updatedAt: '2026-08-28T00:02:20.000Z' }).outcome, 'released');
    assert.equal(store.claimTechnologyTicket({ ticketId: ticket.ticket_id, staffId: 'staff', updatedAt: '2026-08-28T00:02:30.000Z' }).outcome, 'claimed');
    ticket = store.changeTechnologyTicketCategory({ ticketId: ticket.ticket_id, category: 'Network & Internet', staffId: 'staff', updatedAt: '2026-08-28T00:02:40.000Z' });
    assert.equal(ticket.category, 'Network & Internet');
    ticket = store.recordTechnologyTicketFirstResponse({ ticketId: ticket.ticket_id, staffId: 'staff', respondedAt: '2026-08-28T00:03:00.000Z' });
    assert.equal(ticket.first_responder_id, 'staff');
    const urgent = store.markTechnologyTicketUrgent({
      ticketId: ticket.ticket_id,
      requesterId: 'requester',
      reason: 'Payroll processing is blocked for the entire office.',
      urgentAt: '2026-08-28T00:04:00.000Z',
      cooldownMs: 30 * 60 * 1000,
    });
    assert.equal(urgent.outcome, 'marked');
    assert.equal(urgent.ticket.is_urgent, 1);
    assert.equal(urgent.ticket.urgency_count, 1);
    assert.equal(
      store.markTechnologyTicketUrgent({
        ticketId: ticket.ticket_id,
        requesterId: 'requester',
        reason: 'The same business-critical work remains blocked.',
        urgentAt: '2026-08-28T00:10:00.000Z',
        cooldownMs: 30 * 60 * 1000,
      }).outcome,
      'cooldown'
    );
    assert.equal(
      store.markTechnologyTicketUrgent({
        ticketId: ticket.ticket_id,
        requesterId: 'someone-else',
        reason: 'I should not be able to escalate this ticket.',
        urgentAt: '2026-08-28T00:40:00.000Z',
        cooldownMs: 30 * 60 * 1000,
      }).outcome,
      'not_requester'
    );
    ticket = store.closeTechnologyTicketRecord({ ticketId: ticket.ticket_id, actorId: 'closer', resolution: 'Restarted it.', closedAt: '2026-08-28T01:00:00.000Z' });
    assert.equal(ticket.resolved_by_id, 'staff');
    assert.equal(ticket.closed_by_id, 'closer');
    assert.equal(ticket.status, 'CLOSED');
    assert.equal(ticket.is_urgent, 0);
    ticket = store.saveTechnologyTicketClosureMessage({
      ticketId: ticket.ticket_id,
      messageId: 'closure-message',
      updatedAt: '2026-08-28T01:00:01.000Z',
    });
    assert.equal(ticket.closure_message_id, 'closure-message');
    ticket = store.reopenTechnologyTicketRecord({ ticketId: ticket.ticket_id, actorId: 'requester', reopenedAt: '2026-08-28T02:00:00.000Z' });
    assert.equal(ticket.status, 'REOPENED');
    assert.equal(ticket.reopen_count, 1);
    assert.equal(ticket.closure_message_id, null);
    assert.ok(store.getTechnologyTicketEvents().some((event) => event.event_type === 'REOPENED'));
    assert.equal(
      store.getTechnologyTicketEvents().filter((event) => event.event_type === 'MARKED_URGENT').length,
      1
    );
  } finally {
    db.close();
    process.chdir(originalCwd);
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
