const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateTechnologyTicketStatistics,
  median,
  percentile,
} = require('../src/utils/technologyTicketAnalytics');

test('median and tied percentiles are deterministic', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 3]), 2);
  assert.equal(percentile(5, [5, 5, 5], true), 100);
});

test('calculates team statistics and a balanced monthly leaderboard', () => {
  const now = new Date('2026-08-28T04:00:00.000Z');
  const tickets = [
    ['T1', 'CLOSED', 'Hardware'],
    ['T2', 'REOPENED', 'Point of Sale'],
    ['T3', 'CLOSED', 'Hardware'],
    ['T4', 'CLOSED', 'Omnilert Portal'],
    ['T5', 'OPEN', 'Network & Internet'],
    ['T6', 'CLOSED', 'Hardware'],
  ].map(([ticket_id, status, category], index) => ({
    ticket_id,
    status,
    category,
    created_at: `2026-08-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`,
  }));
  const events = [
    { ticket_id: 'T1', event_type: 'FIRST_RESPONSE', actor_id: 'A', created_at: '2026-08-10T00:10:00.000Z', metadata: { durationMs: 600000 } },
    { ticket_id: 'T2', event_type: 'FIRST_RESPONSE', actor_id: 'A', created_at: '2026-08-11T00:20:00.000Z', metadata: { durationMs: 1200000 } },
    { ticket_id: 'T3', event_type: 'FIRST_RESPONSE', actor_id: 'A', created_at: '2026-08-12T00:30:00.000Z', metadata: { durationMs: 1800000 } },
    { ticket_id: 'T1', event_type: 'CLOSED', credited_staff_id: 'A', created_at: '2026-08-10T01:00:00.000Z', metadata: { durationMs: 3600000 } },
    { ticket_id: 'T2', event_type: 'CLOSED', credited_staff_id: 'A', created_at: '2026-08-11T02:00:00.000Z', metadata: { durationMs: 7200000 } },
    { ticket_id: 'T2', event_type: 'REOPENED', actor_id: 'requester', created_at: '2026-08-12T02:00:00.000Z', metadata: {} },
    { ticket_id: 'T3', event_type: 'CLOSED', credited_staff_id: 'A', created_at: '2026-08-12T03:00:00.000Z', metadata: { durationMs: 10800000 } },
    { ticket_id: 'T4', event_type: 'CLOSED', credited_staff_id: 'B', created_at: '2026-08-13T01:00:00.000Z', metadata: { durationMs: 3600000 } },
    { ticket_id: 'T6', event_type: 'CLOSED', credited_staff_id: 'B', created_at: '2026-08-15T01:00:00.000Z', metadata: { durationMs: 3600000 } },
  ];

  const result = calculateTechnologyTicketStatistics({ tickets, events, staffIds: ['A', 'B'], now });
  assert.deepEqual(result.counts, { open: 1, reopened: 1, closed: 4, total: 6, active: 2 });
  assert.equal(result.categories.Hardware, 3);
  assert.equal(result.leaderboard.length, 1);
  assert.equal(result.leaderboard[0].staffId, 'A');
  assert.equal(result.leaderboard[0].resolvedCount, 3);
  assert.equal(result.leaderboard[0].reopenRate, 1 / 3);
  assert.equal(result.unranked[0].staffId, 'B');
});
