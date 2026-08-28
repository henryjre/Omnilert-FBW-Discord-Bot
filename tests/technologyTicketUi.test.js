const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');
const {
  buildTechnologyTicketMessagePayload,
  buildTechnologyTicketPanelPayload,
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
