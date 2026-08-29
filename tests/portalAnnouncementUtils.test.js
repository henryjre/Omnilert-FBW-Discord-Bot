const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');

const {
  buildPortalFinalPayload,
  buildPortalPreviewPayload,
  normalizeSelectedRecipients,
  parsePortalPreviewMessage,
} = require('../src/functions/helpers/portalAnnouncementUtils');

function toMessage(payload) {
  return {
    components: payload.components.map((component) => component.toJSON()),
  };
}

function findButtonLabels(payload) {
  return JSON.stringify(payload.components.map((component) => component.toJSON())).match(
    /"label":"[^"]+"/g
  ) || [];
}

test('portal preview without recipients hides Announce button', () => {
  const payload = buildPortalPreviewPayload({
    announcement: 'Portal update',
    ownerId: '123',
  });

  const labels = findButtonLabels(payload).join(' ');

  assert.equal(payload.flags, MessageFlags.IsComponentsV2);
  assert.equal(labels.includes('"label":"Announce"'), false);
  assert.equal(labels.includes('"label":"Edit"'), true);
  assert.equal(labels.includes('"label":"Add Attachment"'), true);
});

test('portal preview with recipients shows Announce button', () => {
  const payload = buildPortalPreviewPayload({
    announcement: 'Portal update',
    ownerId: '123',
    selectedRecipients: ['@everyone'],
  });

  const labels = findButtonLabels(payload).join(' ');

  assert.equal(labels.includes('"label":"Announce"'), true);
});

test('portal preview preserves multiple role selections and everyone', () => {
  const selected = ['@everyone', '1314413671245676685', '1314413960274907238'];
  const payload = buildPortalPreviewPayload({
    announcement: 'Portal update',
    ownerId: '123',
    selectedRecipients: selected,
  });
  const parsed = parsePortalPreviewMessage(toMessage(payload));

  assert.deepEqual(parsed.selectedRecipients, selected);
});

test('portal preview parser returns edited announcement text', () => {
  const payload = buildPortalPreviewPayload({
    announcement: 'Latest announcement body',
    ownerId: '123',
    selectedRecipients: ['@everyone'],
  });

  assert.equal(parsePortalPreviewMessage(toMessage(payload)).announcement, 'Latest announcement body');
});

test('announcement payload is plain content with a metadata embed and files', () => {
  const payload = buildPortalFinalPayload({
    announcement: 'Plain portal announcement',
    selectedRecipients: ['@everyone', '1314413671245676685'],
    attachments: [{ url: 'https://cdn.discordapp.com/file.pdf' }],
    ownerId: '123',
    timestamp: 'January 1, 2026 at 9:00 AM',
  });

  assert.equal(payload.content, '@everyone <@&1314413671245676685>\n\nPlain portal announcement');
  assert.deepEqual(payload.files, ['https://cdn.discordapp.com/file.pdf']);
  assert.deepEqual(payload.allowedMentions, {
    parse: ['everyone'],
    roles: ['1314413671245676685'],
  });

  const embed = payload.embeds[0].toJSON();
  assert.deepEqual(
    embed.fields.map((field) => field.name),
    ['Targets', 'Announced By', 'Date & Time']
  );
  assert.equal(embed.fields[0].value, '@everyone <@&1314413671245676685>');
  assert.equal(embed.fields[1].value, '<@123>');
  assert.equal(embed.fields[2].value, 'January 1, 2026 at 9:00 AM');
});

test('portal audit copy drops the mention line and suppresses all mentions', () => {
  const payload = buildPortalFinalPayload({
    announcement: 'Plain portal announcement',
    selectedRecipients: ['@everyone', '1314413671245676685'],
    ownerId: '123',
    timestamp: 'January 1, 2026 at 9:00 AM',
    suppressMentions: true,
  });

  assert.equal(payload.content, 'Plain portal announcement');
  assert.equal(payload.content.includes('@everyone'), false);
  assert.equal(payload.content.includes('<@&1314413671245676685>'), false);
  assert.deepEqual(payload.allowedMentions, { parse: [], roles: [], users: [] });

  // The audit copy still carries the same metadata as the announcement.
  const embed = payload.embeds[0].toJSON();
  assert.equal(embed.fields[0].value, '@everyone <@&1314413671245676685>');
  assert.equal(embed.fields[2].value, 'January 1, 2026 at 9:00 AM');
});

test('portal update flag round-trips through the preview message', () => {
  const payload = buildPortalPreviewPayload({
    announcement: 'Portal update',
    ownerId: '123',
    selectedRecipients: ['@everyone', '1314413671245676685'],
    isPortalUpdate: true,
  });
  const parsed = parsePortalPreviewMessage(toMessage(payload));

  assert.equal(parsed.isPortalUpdate, true);
  // Recipients and announcement must survive the new section between them.
  assert.deepEqual(parsed.selectedRecipients, ['@everyone', '1314413671245676685']);
  assert.equal(parsed.announcement, 'Portal update');
});

test('portal update flag defaults to false and round-trips when off', () => {
  const payload = buildPortalPreviewPayload({
    announcement: 'Portal update',
    ownerId: '123',
    selectedRecipients: ['@everyone'],
  });

  assert.equal(parsePortalPreviewMessage(toMessage(payload)).isPortalUpdate, false);
});

test('portal update toggle label reflects state', () => {
  const on = findButtonLabels(
    buildPortalPreviewPayload({ announcement: 'x', ownerId: '123', isPortalUpdate: true })
  ).join(' ');
  const off = findButtonLabels(
    buildPortalPreviewPayload({ announcement: 'x', ownerId: '123' })
  ).join(' ');

  assert.equal(on.includes('"label":"Portal Update: ON"'), true);
  assert.equal(off.includes('"label":"Portal Update: OFF"'), true);
});

test('preview keeps every button row within the five-button cap', () => {
  const payload = buildPortalPreviewPayload({
    announcement: 'Portal update',
    ownerId: '123',
    selectedRecipients: ['@everyone'],
    isPortalUpdate: true,
  });

  const rows = payload.components[0]
    .toJSON()
    .components.filter((component) => Array.isArray(component.components));

  for (const row of rows) {
    assert.ok(row.components.length <= 5, `row has ${row.components.length} components`);
  }
});

test('portal recipient normalization drops unknown values', () => {
  assert.deepEqual(normalizeSelectedRecipients(['@everyone', 'bad']), ['@everyone']);
});
