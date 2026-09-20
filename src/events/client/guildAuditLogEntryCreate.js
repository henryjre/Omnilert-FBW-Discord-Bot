const { captureAuditLogEntry, safelyCapture } = require('../../utils/discordActivity');

module.exports = {
  name: 'guildAuditLogEntryCreate',
  execute(entry, guild) {
    safelyCapture('audit log entry', () => captureAuditLogEntry(entry, guild));
  },
};
