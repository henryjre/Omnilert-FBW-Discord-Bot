const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const {
  buildTechnologyTicketClosedPayload,
  buildTechnologyTicketListPayload,
  buildTechnologyTicketMessagePayload,
  buildTechnologyTicketPanelPayload,
  buildTechnologyTicketStatisticsPayload,
  buildTechnologyTicketUrgentPayload,
  formatTechnologyTicketThreadName,
} = require('../src/utils/technologyTicketUi');

function ticket(overrides = {}) {
  return {
    ticket_id: 'TDD20260001',
    title: 'Office Printer Not Responding',
    description: 'The accounting printer is offline.',
    category: 'Hardware',
    status: 'OPEN',
    requester_id: '100',
    assigned_to_id: null,
    created_at: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

test('builds a Components V2 panel with the three required actions', () => {
  const payload = buildTechnologyTicketPanelPayload();
  assert.equal(payload.flags, MessageFlags.IsComponentsV2);
  const json = JSON.stringify(payload.components.map((component) => component.toJSON()));
  assert.match(json, /Open Ticket/);
  assert.match(json, /View My Tickets/);
  assert.match(json, /Ticket Statistics/);
  assert.match(json, /🎫/);
  assert.match(json, /📋/);
  assert.match(json, /📊/);
});

test('splits a maximum-size escaped description into valid text displays', () => {
  const payload = buildTechnologyTicketMessagePayload(ticket({ description: '*'.repeat(4000) }));
  const json = payload.components[0].toJSON();
  const textDisplays = JSON.stringify(json).match(/"type":10/g) || [];
  assert.ok(textDisplays.length >= 3);
  assert.deepEqual(payload.allowedMentions.roles, ['1314815091908022373']);
});

test('renders a compact ticket summary with dedicated staff controls', () => {
  const payload = buildTechnologyTicketMessagePayload(ticket());
  const json = payload.components[0].toJSON();
  const serialized = JSON.stringify(json);

  assert.match(serialized, /🟦 Office Printer Not Responding/);
  assert.match(serialized, /`TDD20260001` · \*\*OPEN\*\* · Hardware/);
  assert.match(serialized, /📝 Request details/);
  assert.match(serialized, /🛠️ Staff controls/);
  assert.match(serialized, /\*\*Owner\*\* · Unassigned/);
  assert.match(serialized, /Change category/);
  assert.doesNotMatch(serialized, /Assigned to:/);

  const staffSection = json.components.find(
    (component) => component.type === 9 && component.accessory?.custom_id?.startsWith('techTicket:claim:')
  );
  assert.equal(staffSection.accessory.label, 'Claim');
  assert.equal(staffSection.accessory.custom_id, 'techTicket:claim:TDD20260001');
});

test('deduplicates user mentions when one staff member fills multiple ticket roles', () => {
  const payload = buildTechnologyTicketMessagePayload(
    ticket({
      status: 'CLOSED',
      requester_id: 'requester',
      assigned_to_id: 'staff',
      first_responder_id: 'staff',
      resolved_by_id: 'staff',
      closed_at: '2026-08-28T01:00:00.000Z',
      resolution: 'Replaced the damaged network cable.',
    })
  );

  assert.deepEqual(payload.allowedMentions.users, ['requester', 'staff']);
});

test('renders urgent state, escalation control, and a controlled staff notification', () => {
  const urgentTicket = ticket({
    is_urgent: 1,
    urgency_reason: 'Point of Sale checkout is blocking all customer transactions.',
    urgent_at: '2026-08-28T00:10:00.000Z',
  });
  const ticketPayload = buildTechnologyTicketMessagePayload(urgentTicket);
  const serialized = JSON.stringify(ticketPayload.components[0].toJSON());
  assert.match(serialized, /🚨 URGENT/);
  assert.match(serialized, /Urgent request/);
  assert.match(serialized, /Send Reminder/);
  assert.match(serialized, /techTicket:urgent:TDD20260001/);

  const notification = buildTechnologyTicketUrgentPayload(urgentTicket);
  assert.match(JSON.stringify(notification.components[0].toJSON()), /Urgent ticket escalation/);
  assert.deepEqual(notification.allowedMentions.users, ['100']);
  assert.deepEqual(notification.allowedMentions.roles, ['1314815091908022373']);
});

test('resolution notice mentions the requester and can render without reopen controls', () => {
  const closedTicket = ticket({
    status: 'CLOSED',
    requester_id: 'requester',
    resolved_by_id: 'staff',
    closed_at: '2026-08-28T01:00:00.000Z',
    resolution: 'Replaced the damaged network cable.',
  });
  const withButton = buildTechnologyTicketClosedPayload(closedTicket, 'closer');
  const withoutButton = buildTechnologyTicketClosedPayload(closedTicket, 'closer', {
    includeReopenButton: false,
  });

  assert.match(JSON.stringify(withButton.components[0].toJSON()), /<@requester>/);
  assert.match(JSON.stringify(withButton.components[0].toJSON()), /Reopen Ticket/);
  assert.doesNotMatch(JSON.stringify(withoutButton.components[0].toJSON()), /Reopen Ticket/);
  assert.deepEqual(withButton.allowedMentions.users, ['requester', 'closer']);
});

test('formats lifecycle thread names within Discord limits', () => {
  const name = formatTechnologyTicketThreadName(ticket({ title: 'A'.repeat(200), status: 'REOPENED' }));
  assert.ok(name.length <= 100);
  assert.match(name, /^ʀᴇᴏᴘᴇɴᴇᴅ \|/);
  assert.match(name, /TDD20260001$/);

  const urgentName = formatTechnologyTicketThreadName(
    ticket({ title: 'A'.repeat(200), status: 'OPEN', is_urgent: 1 })
  );
  assert.ok(urgentName.length <= 100);
  assert.match(urgentName, /^🚨 ᴏᴘᴇɴ \|/);
  assert.match(urgentName, /TDD20260001$/);

  const closedName = formatTechnologyTicketThreadName(
    ticket({ status: 'CLOSED', is_urgent: 1 })
  );
  assert.doesNotMatch(closedName, /^🚨/);
});

function collectCustomIds(value, ids = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectCustomIds(item, ids);
    return ids;
  }
  if (!value || typeof value !== 'object') return ids;
  if (value.custom_id) ids.push(value.custom_id);
  for (const child of Object.values(value)) collectCustomIds(child, ids);
  return ids;
}

test('empty ticket list uses unique component custom IDs', () => {
  const payload = buildTechnologyTicketListPayload({
    tickets: [],
    userId: '100',
    guildId: 'guild',
    filter: 'active',
    page: 0,
  });
  const ids = collectCustomIds(payload.components.map((component) => component.toJSON()));
  assert.equal(ids.length, new Set(ids).size);
  assert.match(JSON.stringify(payload.components[0].toJSON()), /No tickets are available/);
});

test('statistics render separate overview and staff empty-state cards', () => {
  const payload = buildTechnologyTicketStatisticsPayload({
    counts: { active: 0, open: 0, reopened: 0, closed: 0, total: 0 },
    activity: { created7: 0, closed7: 0, created30: 0, closed30: 0 },
    medianResolutionMs: null,
    oldestActiveMs: null,
    categories: {},
    leaderboard: [],
    unranked: [{ staffId: '100', resolvedCount: 0, firstResponsesHandled: 0 }],
    monthLabel: 'August 2026',
  });
  assert.equal(payload.components.length, 2);
  const json = JSON.stringify(payload.components.map((component) => component.toJSON()));
  assert.match(json, /Queue board/);
  assert.match(json, /No ticket history yet/);
  assert.match(json, /No handling activity yet/);
  assert.doesNotMatch(json, /<@100>/);
  assert.deepEqual(payload.allowedMentions, { users: [], roles: [], repliedUser: false });
});
