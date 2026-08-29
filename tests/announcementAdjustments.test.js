const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAcknowledgmentDeductionPayload,
  buildAcknowledgmentDeductionReason,
  extractAnnouncementTitle,
} = require('../src/functions/helpers/announcementAdjustments');

test('extractAnnouncementTitle skips the role mention line', () => {
  const content = `<@&1314413671245676685> <@&1336991998791385129>

Avoid Misuse of Mineral Water

Good day team!`;

  assert.equal(
    extractAnnouncementTitle(content, 'Announcement 123'),
    'Avoid Misuse of Mineral Water'
  );
});

test('extractAnnouncementTitle skips an @everyone mention line', () => {
  const content = `@everyone

Proper Logging of Work Schedules

Good day team!`;

  assert.equal(
    extractAnnouncementTitle(content, 'Announcement 123'),
    'Proper Logging of Work Schedules'
  );
});

test('extractAnnouncementTitle uses the first line when there is no mention line', () => {
  const content = `Do not use the POS System as the cashier

Reminder!`;

  assert.equal(
    extractAnnouncementTitle(content, 'Announcement 123'),
    'Do not use the POS System as the cashier'
  );
});

test('extractAnnouncementTitle returns fallback when content carries only mentions', () => {
  assert.equal(
    extractAnnouncementTitle('@everyone <@&1314413671245676685>', 'Announcement 123'),
    'Announcement 123'
  );
});

test('extractAnnouncementTitle returns fallback when content is empty', () => {
  assert.equal(extractAnnouncementTitle('', 'Announcement 123'), 'Announcement 123');
});

test('buildAcknowledgmentDeductionReason includes title and Discord message link', () => {
  const reason = buildAcknowledgmentDeductionReason({
    description: `@everyone

Avoid Misuse of Mineral Water

Good day team!`,
    announcementId: '123',
    messageUrl: 'https://discord.com/channels/1/2/3',
  });

  assert.equal(
    reason,
    'Failure to acknowledge the announcement: Avoid Misuse of Mineral Water - https://discord.com/channels/1/2/3'
  );
});

test('buildAcknowledgmentDeductionPayload builds Omnilert adjustment body', () => {
  assert.deepEqual(
    buildAcknowledgmentDeductionPayload(
      ['748568303219245117', '844881805688963072'],
      'Failure to acknowledge the announcement: Avoid Misuse of Mineral Water - https://discord.com/channels/1/2/3'
    ),
    {
      discord_id: ['748568303219245117', '844881805688963072'],
      adjustment_type: 'epi_adjustment',
      adjustment_direction: 'deduction',
      amount: 1,
      reason:
        'Failure to acknowledge the announcement: Avoid Misuse of Mineral Water - https://discord.com/channels/1/2/3',
    }
  );
});
