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
        value: '\u200b'
      },
      {
        name: 'Violation Notice Link',
        value: link || 'No VN link found.'
      },
      {
        name: 'Violation Notice Status',
        value: status || 'Undefined Status'
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

module.exports = {
  editVnrStatus,
  cleanAuditDescription
};
