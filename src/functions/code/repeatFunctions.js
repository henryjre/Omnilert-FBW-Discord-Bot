const auditCompletedChannelId = '1423597979604095046';
const caseReportChannelId = '1342895351631187970';

const editVnrStatus = async (messageEmbed, status, link, client) => {
  const messageField = messageEmbed.data.fields.find(
    (f) => f.name === 'Audit Message ID' || f.name === 'Case Message ID'
  );
  const messageIdFieldName = messageField.name;
  const messageId = messageField.value;

  const messageChannel = client.channels.cache.get(
    messageIdFieldName === 'Audit Message ID' ? auditCompletedChannelId : caseReportChannelId
  );

  let message;

  if (messageIdFieldName === 'Audit Message ID') {
    message = await messageChannel.messages.fetch(messageId);
  } else {
    const thread = await client.channels.cache.get(messageId);
    const messages = await thread.messages.fetch({ after: '0', limit: 1 });
    message = messages.first();
  }

  const newEmbed = message.embeds[0];

  console.log(newEmbed);

  const vnrStatusField = newEmbed.data.fields.find((f) => f.name === 'Violation Notice Status');
  const vnrLinkField = newEmbed.data.fields.find((f) => f.name === 'Violation Notice Link');

  if (vnrStatusField && vnrLinkField) {
    vnrStatusField.value = status || 'Undefined Status';
    vnrLinkField.value = link || 'No VN link found.';
  } else {
    newEmbed.data.fields.push(
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

  await message.edit({ embeds: [newEmbed] });
};

const fetchVNandRequestID = async (messageEmbed, client) => {
  const messageIdField = messageEmbed.data.fields.find(
    (f) => f.name === 'Audit Message ID' || f.name === 'Case Message ID'
  );
  const messageIdFieldName = messageIdField.name;
  const messageId = messageIdField.value;

  const messageChannel = client.channels.cache.get(
    messageIdFieldName === 'Audit Message ID' ? auditCompletedChannelId : caseReportChannelId
  );

  let request_id;
  if (messageIdFieldName === 'Audit Message ID') {
    const auditMessage = await messageChannel.messages.fetch(messageId);
    const title = auditMessage.embeds[0].data.description;
    const { audit_id } = cleanAuditDescription(title);
    request_id = audit_id;
  } else {
    const thread = await client.channels.cache.get(messageId);
    const caseMessage = (
      await thread.messages.fetch({
        limit: 1,
        after: thread.id,
      })
    ).first();
    const title = caseMessage.embeds[0].data.title;
    const case_id = cleanCaseDescription(title);
    request_id = case_id;
  }

  const vnrTitle = messageEmbed.data.description;
  const vnrIdMatch = vnrTitle.match(/VN-\d+/);
  const vnrId = vnrIdMatch ? vnrIdMatch[0] : '0000';

  return { vnrId, request_id };
};

const cleanAuditDescription = (description) => {
  const parts = description.trim().split(' ');
  const cleanedDescription = parts.slice(2).join(' ');
  const splitDescription = cleanedDescription.split('|');
  const auditType = splitDescription[0] ? splitDescription[0].trim() : null;
  const auditId = splitDescription[1] ? splitDescription[1].trim() : null;
  return { audit_type: auditType, audit_id: auditId };
};

const cleanCaseDescription = (description) => {
  const beforePipe = description.split('|')[0]; // "📌 CASE 0081 "
  const cleaned = beforePipe.replace('📌', '').trim(); // "CASE 0081"
  return cleaned;
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
  fetchVNandRequestID,
};
