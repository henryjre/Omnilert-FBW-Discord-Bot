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

test('portal final payload is plain content with files and no embeds', () => {
  const payload = buildPortalFinalPayload({
    announcement: 'Plain portal announcement',
    selectedRecipients: ['@everyone', '1314413671245676685'],
    attachments: [{ url: 'https://cdn.discordapp.com/file.pdf' }],
  });

  assert.equal(payload.content, '@everyone <@&1314413671245676685>\n\nPlain portal announcement');
  assert.deepEqual(payload.files, ['https://cdn.discordapp.com/file.pdf']);
  assert.equal('embeds' in payload, false);
  assert.deepEqual(payload.allowedMentions, {
    parse: ['everyone'],
    roles: ['1314413671245676685'],
  });
});

test('portal recipient normalization drops unknown values', () => {
  assert.deepEqual(normalizeSelectedRecipients(['@everyone', 'bad']), ['@everyone']);
});
