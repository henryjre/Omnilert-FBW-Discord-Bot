const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const {
  buildTechnologyTicketListPayload,
  buildTechnologyTicketMessagePayload,
  buildTechnologyTicketPanelPayload,
  buildTechnologyTicketStatisticsPayload,
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
});

test('splits a maximum-size escaped description into valid text displays', () => {
  const payload = buildTechnologyTicketMessagePayload(ticket({ description: '*'.repeat(4000) }));
  const json = payload.components[0].toJSON();
  const textDisplays = JSON.stringify(json).match(/"type":10/g) || [];
  assert.ok(textDisplays.length >= 3);
  assert.deepEqual(payload.allowedMentions.roles, ['1314815091908022373']);
});

test('formats lifecycle thread names within Discord limits', () => {
  const name = formatTechnologyTicketThreadName(ticket({ title: 'A'.repeat(200), status: 'REOPENED' }));
  assert.ok(name.length <= 100);
  assert.match(name, /^ʀᴇᴏᴘᴇɴᴇᴅ \|/);
  assert.match(name, /TDD20260001$/);
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
