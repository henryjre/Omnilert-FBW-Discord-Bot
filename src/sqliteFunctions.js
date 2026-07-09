const db = require('./sqliteConnection');
const { nanoid } = require('nanoid');

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

////////////////////////////////////////////////////////////
// Branches
////////////////////////////////////////////////////////////

const createBranch = db.transaction(({ id, name, role = null }) => {
  const insertStmt = db.prepare(`
    INSERT INTO branches (id, name, role)
    VALUES (@id, @name, @role)
  `);

  insertStmt.run({
    id,
    name,
    role,
  });

  return { id, name, role };
});

const getBranches = db.transaction(() => {
  return db
    .prepare(
      `
        SELECT id, name, role
        FROM branches
        ORDER BY id ASC
      `
    )
    .all();
});

const getBranchById = db.transaction((id) => {
  return (
    db
      .prepare(
        `
          SELECT id, name, role
          FROM branches
          WHERE id = ?
        `
      )
      .get(id) || null
  );
});

const getBranchByName = db.transaction((name) => {
  return (
    db
      .prepare(
        `
          SELECT id, name, role
          FROM branches
          WHERE name = ?
        `
      )
      .get(name) || null
  );
});

const updateBranch = db.transaction(({ originalId, id, name, role = null }) => {
  const updateStmt = db.prepare(`
    UPDATE branches
    SET id = @id,
        name = @name,
        role = @role
    WHERE id = @original_id
  `);

  const result = updateStmt.run({
    original_id: originalId,
    id,
    name,
    role,
  });

  if (result.changes === 0) return null;
  return (
    db
      .prepare(
        `
          SELECT id, name, role
          FROM branches
          WHERE id = ?
        `
      )
      .get(id) || null
  );
});

const getBranchRoles = db.transaction(() => {
  return db
    .prepare(
      `
        SELECT role
        FROM branches
        WHERE role IS NOT NULL AND role != ''
      `
    )
    .all()
    .map((row) => row.role);
});

const createPendingBranchCreation = db.transaction((data, createdBy) => {
  const token = nanoid(12);
  db.prepare(
    `
      INSERT INTO pending_branch_creations (token, data, created_by)
      VALUES (?, ?, ?)
    `
  ).run(token, JSON.stringify(data), createdBy);

  return token;
});

const getPendingBranchCreation = db.transaction((token) => {
  const row = db
    .prepare(
      `
        SELECT token, data, created_by, created_at
        FROM pending_branch_creations
        WHERE token = ?
      `
    )
    .get(token);

  if (!row) return null;

  try {
    return {
      token: row.token,
      data: JSON.parse(row.data),
      created_by: row.created_by,
      created_at: row.created_at,
    };
  } catch (error) {
    return null;
  }
});

const deletePendingBranchCreation = db.transaction((token) => {
  const result = db.prepare(`DELETE FROM pending_branch_creations WHERE token = ?`).run(token);
  return result.changes > 0;
});

////////////////////////////////////////////////////////////
// Departments
////////////////////////////////////////////////////////////

const createDepartment = db.transaction(({ name, emoji, roleId = null, channelId = null, createdBy }) => {
  const insertStmt = db.prepare(`
    INSERT INTO departments (name, emoji, role_id, channel_id, created_by)
    VALUES (@name, @emoji, @role_id, @channel_id, @created_by)
  `);

  const result = insertStmt.run({
    name,
    emoji,
    role_id: roleId,
    channel_id: channelId,
    created_by: createdBy,
  });

  return {
    id: result.lastInsertRowid,
    name,
    emoji,
    role_id: roleId,
    channel_id: channelId,
    created_by: createdBy,
  };
});

const getDepartments = db.transaction(() => {
  return db
    .prepare(
      `
        SELECT id, name, emoji, role_id, channel_id, created_by, created_at
        FROM departments
        ORDER BY id ASC
      `
    )
    .all();
});

const getDepartmentById = db.transaction((id) => {
  return (
    db
      .prepare(
        `
          SELECT id, name, emoji, role_id, channel_id, created_by, created_at
          FROM departments
          WHERE id = ?
        `
      )
      .get(id) || null
  );
});

const updateDepartment = db.transaction(({ id, name, emoji, roleId = null, channelId = null }) => {
  const updateStmt = db.prepare(`
    UPDATE departments
    SET name = @name,
        emoji = @emoji,
        role_id = @role_id,
        channel_id = @channel_id
    WHERE id = @id
  `);

  const result = updateStmt.run({
    id,
    name,
    emoji,
    role_id: roleId,
    channel_id: channelId,
  });

  if (result.changes === 0) return null;
  return (
    db
      .prepare(
        `
          SELECT id, name, emoji, role_id, channel_id, created_by, created_at
          FROM departments
          WHERE id = ?
        `
      )
      .get(id) || null
  );
});

const deleteDepartment = db.transaction((id) => {
  const result = db.prepare(`DELETE FROM departments WHERE id = ?`).run(id);
  return result.changes > 0;
});

////////////////////////////////////////////////////////////
// Department Voice Sessions
////////////////////////////////////////////////////////////

function selectDepartmentVoiceSessionById(id) {
  return (
    db
      .prepare(
        `
          SELECT *
          FROM department_voice_sessions
          WHERE id = ?
        `
      )
      .get(id) || null
  );
}

function selectDepartmentVoiceSessionByUserDate(userId, departmentId, dateKey) {
  return (
    db
      .prepare(
        `
          SELECT *
          FROM department_voice_sessions
          WHERE user_id = ?
            AND department_id = ?
            AND date_key = ?
        `
      )
      .get(userId, departmentId, dateKey) || null
  );
}

function selectActiveDepartmentVoiceSessionByUser(userId) {
  return (
    db
      .prepare(
        `
          SELECT *
          FROM department_voice_sessions
          WHERE user_id = ?
            AND active = 1
          ORDER BY id DESC
          LIMIT 1
        `
      )
      .get(userId) || null
  );
}

const getDepartmentVoiceSessionById = db.transaction((id) => {
  return selectDepartmentVoiceSessionById(id);
});

const getDepartmentVoiceSessionByUserDate = db.transaction((userId, departmentId, dateKey) => {
  return selectDepartmentVoiceSessionByUserDate(userId, departmentId, dateKey);
});

const getActiveDepartmentVoiceSessionByUser = db.transaction((userId) => {
  return selectActiveDepartmentVoiceSessionByUser(userId);
});

const getActiveDepartmentVoiceSessionByThreadUser = db.transaction((threadId, userId) => {
  return (
    db
      .prepare(
        `
          SELECT *
          FROM department_voice_sessions
          WHERE thread_id = ?
            AND user_id = ?
            AND active = 1
          ORDER BY id DESC
          LIMIT 1
        `
      )
      .get(threadId, userId) || null
  );
});

const upsertDepartmentVoiceSession = db.transaction(
  ({ guildId, userId, departmentId, threadId, voiceChannelId, dateKey, checkInAt }) => {
    const existing = selectDepartmentVoiceSessionByUserDate(userId, departmentId, dateKey);

    if (existing) {
      const nextTimerVersion = existing.timer_version + 1;
      db.prepare(
        `
          UPDATE department_voice_sessions
          SET guild_id = @guild_id,
              thread_id = @thread_id,
              voice_channel_id = @voice_channel_id,
              active = 1,
              paused = 0,
              paused_at = NULL,
              paused_channel_id = NULL,
              remaining_seconds = NULL,
              timer_version = @timer_version,
              check_in_at = @check_in_at,
              check_out_at = NULL,
              last_update_at = @check_in_at,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `
      ).run({
        id: existing.id,
        guild_id: guildId,
        thread_id: threadId,
        voice_channel_id: voiceChannelId,
        timer_version: nextTimerVersion,
        check_in_at: checkInAt,
      });

      return selectDepartmentVoiceSessionById(existing.id);
    }

    const result = db
      .prepare(
        `
          INSERT INTO department_voice_sessions (
            guild_id,
            user_id,
            department_id,
            thread_id,
            voice_channel_id,
            date_key,
            active,
            timer_version,
            check_in_at,
            last_update_at
          )
          VALUES (
            @guild_id,
            @user_id,
            @department_id,
            @thread_id,
            @voice_channel_id,
            @date_key,
            1,
            0,
            @check_in_at,
            @check_in_at
          )
        `
      )
      .run({
        guild_id: guildId,
        user_id: userId,
        department_id: departmentId,
        thread_id: threadId,
        voice_channel_id: voiceChannelId,
        date_key: dateKey,
        check_in_at: checkInAt,
      });

    return selectDepartmentVoiceSessionById(result.lastInsertRowid);
  }
);

const markDepartmentVoiceSessionCheckedOut = db.transaction((sessionId, checkOutAt) => {
  const session = selectDepartmentVoiceSessionById(sessionId);
  if (!session) return null;

  db.prepare(
    `
      UPDATE department_voice_sessions
      SET active = 0,
          paused = 0,
          paused_at = NULL,
          paused_channel_id = NULL,
          remaining_seconds = NULL,
          timer_version = timer_version + 1,
          check_out_at = @check_out_at,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `
  ).run({
    id: sessionId,
    check_out_at: checkOutAt,
  });

  return selectDepartmentVoiceSessionById(sessionId);
});

const markActiveDepartmentVoiceSessionCheckedOut = db.transaction((userId, checkOutAt) => {
  const session = selectActiveDepartmentVoiceSessionByUser(userId);
  if (!session) return null;
  db.prepare(
    `
      UPDATE department_voice_sessions
      SET active = 0,
          paused = 0,
          paused_at = NULL,
          paused_channel_id = NULL,
          remaining_seconds = NULL,
          timer_version = timer_version + 1,
          check_out_at = @check_out_at,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `
  ).run({
    id: session.id,
    check_out_at: checkOutAt,
  });

  return selectDepartmentVoiceSessionById(session.id);
});

const pauseDepartmentVoiceSession = db.transaction((userId, pausedAt, pausedChannelId, remainingSeconds) => {
  const session = selectActiveDepartmentVoiceSessionByUser(userId);
  if (!session) return null;

  db.prepare(
    `
      UPDATE department_voice_sessions
      SET paused = 1,
          paused_at = @paused_at,
          paused_channel_id = @paused_channel_id,
          remaining_seconds = @remaining_seconds,
          timer_version = timer_version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `
  ).run({
    id: session.id,
    paused_at: pausedAt,
    paused_channel_id: pausedChannelId,
    remaining_seconds: remainingSeconds,
  });

  return selectDepartmentVoiceSessionById(session.id);
});

const resumeDepartmentVoiceSession = db.transaction((userId, resumedAt) => {
  const session = selectActiveDepartmentVoiceSessionByUser(userId);
  if (!session || !session.paused) return null;

  const remainingSeconds = session.remaining_seconds;
  db.prepare(
    `
      UPDATE department_voice_sessions
      SET paused = 0,
          paused_at = NULL,
          paused_channel_id = NULL,
          remaining_seconds = NULL,
          timer_version = timer_version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `
  ).run({
    id: session.id,
  });

  const resumedSession = selectDepartmentVoiceSessionById(session.id);
  return {
    ...resumedSession,
    resume_remaining_seconds: remainingSeconds,
    resumed_at: resumedAt,
  };
});

const recordDepartmentVoiceSessionUpdate = db.transaction((sessionId, updateAt) => {
  const session = selectDepartmentVoiceSessionById(sessionId);
  if (!session || !session.active) return null;

  db.prepare(
    `
      UPDATE department_voice_sessions
      SET last_update_at = @last_update_at,
          paused = 0,
          paused_at = NULL,
          paused_channel_id = NULL,
          remaining_seconds = NULL,
          timer_version = timer_version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `
  ).run({
    id: sessionId,
    last_update_at: updateAt,
  });

  return selectDepartmentVoiceSessionById(sessionId);
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
  createBranch,
  getBranches,
  getBranchById,
  getBranchByName,
  updateBranch,
  getBranchRoles,
  createPendingBranchCreation,
  getPendingBranchCreation,
  deletePendingBranchCreation,
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentVoiceSessionById,
  getDepartmentVoiceSessionByUserDate,
  getActiveDepartmentVoiceSessionByUser,
  getActiveDepartmentVoiceSessionByThreadUser,
  upsertDepartmentVoiceSession,
  markDepartmentVoiceSessionCheckedOut,
  markActiveDepartmentVoiceSessionCheckedOut,
  pauseDepartmentVoiceSession,
  resumeDepartmentVoiceSession,
  recordDepartmentVoiceSessionUpdate,
};
