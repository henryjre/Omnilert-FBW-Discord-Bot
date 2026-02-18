const db = require('./sqliteConnection');

const getNextAuditId = db.transaction((code) => {
  const upsertCounter = db.prepare(`
    INSERT INTO audit_id_count(code, last_id)
    VALUES (?, 1)                                   
    ON CONFLICT(code) DO UPDATE
      SET last_id = audit_id_count.last_id + 1      
    RETURNING last_id;                            
  `);

  const row = upsertCounter.get(code);
  return row.last_id;
});

const saveAuditRatings = db.transaction((discordId, dataArray) => {
  const upsertStmt = db.prepare(`
    INSERT INTO audit_ratings (discord_id, data)
    VALUES (@discord_id, @data)
    ON CONFLICT(discord_id)
    DO UPDATE SET
      data = excluded.data,
      last_updated = datetime('now')
    `);

  if (!Array.isArray(dataArray)) {
    throw new Error('dataArray must be an array of objects');
  }

  upsertStmt.run({
    discord_id: discordId,
    data: JSON.stringify(dataArray),
  });
});

const getAuditRatings = db.transaction((discordId) => {
  const selectStmt = db.prepare(`
    SELECT data FROM audit_ratings WHERE discord_id = ?
    `);

  const row = selectStmt.get(discordId);
  if (!row) return null;

  try {
    return JSON.parse(row.data);
  } catch (err) {
    console.error('Failed to parse data JSON:', err);
    return [];
  }
});

////////////////////////////////////////////////////////////

const saveAttendanceRecords = db.transaction((discordId, dataArray) => {
  const upsertStmt = db.prepare(`
    INSERT INTO attendance_records (discord_id, data)
    VALUES (@discord_id, @data)
    ON CONFLICT(discord_id)
    DO UPDATE SET
      data = excluded.data,
      last_updated = datetime('now')
    `);

  if (!Array.isArray(dataArray)) {
    throw new Error('dataArray must be an array of objects');
  }

  upsertStmt.run({
    discord_id: discordId,
    data: JSON.stringify(dataArray),
  });
});

const getAttendanceRecords = db.transaction((discordId) => {
  const selectStmt = db.prepare(`
    SELECT data FROM attendance_records WHERE discord_id = ?
    `);

  const row = selectStmt.get(discordId);
  if (!row) return null;

  try {
    return JSON.parse(row.data);
  } catch (err) {
    console.error('Failed to parse data JSON:', err);
    return [];
  }
});

////////////////////////////////////////////////////////////
// Thread Approvals Tracking
////////////////////////////////////////////////////////////

const incrementThreadApprovals = db.transaction((threadId, parentChannelId, starterMessageId) => {
  const upsertStmt = db.prepare(`
    INSERT INTO thread_approvals (thread_id, parent_channel_id, starter_message_id, current_approvals)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(thread_id)
    DO UPDATE SET
      current_approvals = current_approvals + 1,
      last_updated = CURRENT_TIMESTAMP
  `);

  upsertStmt.run(threadId, parentChannelId, starterMessageId);
});

const decrementThreadApprovals = db.transaction((threadId) => {
  const updateStmt = db.prepare(`
    UPDATE thread_approvals
    SET current_approvals = MAX(current_approvals - 1, 0),
        last_updated = CURRENT_TIMESTAMP
    WHERE thread_id = ?
  `);

  updateStmt.run(threadId);
});

const getThreadApprovals = db.transaction((threadId) => {
  const selectStmt = db.prepare(`
    SELECT current_approvals, parent_channel_id, starter_message_id
    FROM thread_approvals
    WHERE thread_id = ?
  `);

  const row = selectStmt.get(threadId);
  return row || { current_approvals: 0, parent_channel_id: null, starter_message_id: null };
});

////////////////////////////////////////////////////////////
// Announcement Acknowledgment Tracking
////////////////////////////////////////////////////////////

const createAnnouncementTracking = db.transaction((announcementId, channelId, threadId, expectedUsers, timeoutMinutes = 5) => {
  const insertStmt = db.prepare(`
    INSERT INTO announcement_acknowledgments (announcement_id, channel_id, thread_id, expected_users, timeout_minutes)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertStmt.run(announcementId, channelId, threadId, JSON.stringify(expectedUsers), timeoutMinutes);
});

const addAcknowledgment = db.transaction((announcementId, userId) => {
  const selectStmt = db.prepare(`
    SELECT acknowledged_users FROM announcement_acknowledgments WHERE announcement_id = ?
  `);

  const row = selectStmt.get(announcementId);
  if (!row) return { alreadyAcknowledged: false, notFound: true };

  const acknowledgedUsers = JSON.parse(row.acknowledged_users);

  if (acknowledgedUsers.includes(userId)) {
    return { alreadyAcknowledged: true };
  }

  acknowledgedUsers.push(userId);

  const updateStmt = db.prepare(`
    UPDATE announcement_acknowledgments
    SET acknowledged_users = ?
    WHERE announcement_id = ?
  `);

  updateStmt.run(JSON.stringify(acknowledgedUsers), announcementId);

  return { alreadyAcknowledged: false };
});

const getAnnouncementTracking = db.transaction((announcementId) => {
  const selectStmt = db.prepare(`
    SELECT * FROM announcement_acknowledgments WHERE announcement_id = ?
  `);

  const row = selectStmt.get(announcementId);
  if (!row) return null;

  return {
    ...row,
    expected_users: JSON.parse(row.expected_users),
    acknowledged_users: JSON.parse(row.acknowledged_users),
  };
});

const getNonAcknowledgers = db.transaction((announcementId) => {
  const selectStmt = db.prepare(`
    SELECT expected_users, acknowledged_users FROM announcement_acknowledgments WHERE announcement_id = ?
  `);

  const row = selectStmt.get(announcementId);
  if (!row) return [];

  const expectedUsers = JSON.parse(row.expected_users);
  const acknowledgedUsers = JSON.parse(row.acknowledged_users);

  return expectedUsers.filter(userId => !acknowledgedUsers.includes(userId));
});

const deleteAnnouncementTracking = db.transaction((announcementId) => {
  const deleteStmt = db.prepare(`
    DELETE FROM announcement_acknowledgments WHERE announcement_id = ?
  `);

  deleteStmt.run(announcementId);
});

module.exports = {
  getNextAuditId,
  saveAuditRatings,
  getAuditRatings,
  saveAttendanceRecords,
  getAttendanceRecords,
  incrementThreadApprovals,
  decrementThreadApprovals,
  getThreadApprovals,
  createAnnouncementTracking,
  addAcknowledgment,
  getAnnouncementTracking,
  getNonAcknowledgers,
  deleteAnnouncementTracking,
};
