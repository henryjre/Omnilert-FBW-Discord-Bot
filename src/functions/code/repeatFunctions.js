const editVnrStatus = async (messageEmbed, status, link, client) => {
  const auditCompletedChannelId = '1423597979604095046';

  const auditMessageIdField = messageEmbed.data.fields.find((f) => f.name === 'Audit Message ID');
  const auditMessageId = auditMessageIdField.value;

  const auditCompletedChannel = client.channels.cache.get(auditCompletedChannelId);

  const auditMessage = await auditCompletedChannel.messages.fetch(auditMessageId);

  const auditMessageEmbed = auditMessage.embeds[0];

  const vnrStatusField = auditMessageEmbed.data.fields.find(
    (f) => f.name === 'Violation Notice Status'
  );
  const vnrLinkField = auditMessageEmbed.data.fields.find(
    (f) => f.name === 'Violation Notice Link'
  );

  if (vnrStatusField && vnrLinkField) {
    vnrStatusField.value = status || 'Undefined Status';
    vnrLinkField.value = link || 'No VN link found.';
  } else {
    auditMessageEmbed.data.fields.push(
      {
        name: '\u200b',
        value: '\u200b',
      },
      {
        name: 'Violation Notice Link',
        value: link || 'No VN link found.',
      },
      {
        name: 'Violation Notice Status',
        value: status || 'Undefined Status',
      }
    );
  }

  await auditMessage.edit({ embeds: [auditMessageEmbed] });
};

const cleanAuditDescription = (description) => {
  const parts = description.trim().split(' ');
  const cleanedDescription = parts.slice(2).join(' ');
  const splitDescription = cleanedDescription.split('|');
  const auditType = splitDescription[0] ? splitDescription[0].trim() : null;
  const auditId = splitDescription[1] ? splitDescription[1].trim() : null;
  return { audit_type: auditType, audit_id: auditId };
};

function makeEmbedTable(headers, rows, maxWidth = 60) {
  const s = (v) =>
    String(v ?? '')
      .replace(/\n/g, ' ')
      .trim();

  const cols = headers.length;
  const widths = headers.map((h, i) =>
    Math.max(4, s(h).length, ...rows.map((r) => s(r[i]).length))
  );

  const sepOverhead = 3 * (cols - 1);
  const totalWidth = () => widths.reduce((a, b) => a + b, 0) + sepOverhead;

  while (totalWidth() > maxWidth) {
    let widest = 0;
    for (let i = 1; i < cols; i++) if (widths[i] > widths[widest]) widest = i;
    if (widths[widest] <= 4) break;
    widths[widest]--;
  }

  const cut = (text, w) => {
    const t = s(text);
    return t.length <= w ? t : w <= 1 ? t.slice(0, w) : t.slice(0, w - 1) + '…';
  };
  const pad = (text, w) => cut(text, w).padEnd(w, ' ');
  const join = (arr) => arr.join(' | ');

  const headerLine = join(headers.map((h, i) => pad(h, widths[i])));
  const rule = '─'.repeat(Math.min(maxWidth, headerLine.length));
  const body = rows.map((r) => join(r.map((c, i) => pad(c, widths[i]))));

  return '```\n' + headerLine + '\n' + rule + '\n' + body.join('\n') + '\n```';
}

module.exports = {
  editVnrStatus,
  cleanAuditDescription,
  makeEmbedTable,
};
