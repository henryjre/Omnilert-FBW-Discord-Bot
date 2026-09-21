const db = require('../sqliteConnection');

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

const insertOutboxStatement = db.prepare(`
  INSERT OR IGNORE INTO discord_activity_outbox
    (event_id, event_type, payload, state, attempts, created_at)
  VALUES
    (@event_id, @event_type, @payload, @state, 0, @created_at)
`);

function insertActivity(activity, state = 'pending') {
  const result = insertOutboxStatement.run({
    event_id: activity.id,
    event_type: activity.type,
    payload: JSON.stringify(activity),
    state,
    created_at: activity.observed_at || new Date().toISOString(),
  });

  return { inserted: result.changes > 0, eventId: activity.id };
}

function getActivity(eventId) {
  const row = db.prepare(`
    SELECT * FROM discord_activity_outbox WHERE event_id = ?
  `).get(eventId);

  if (!row) return null;
  return { ...row, payload: parseJson(row.payload, {}) };
}

function listRecoverableActivities() {
  return db.prepare(`
    SELECT event_id
    FROM discord_activity_outbox
    WHERE state = 'pending'
    ORDER BY created_at ASC
  `).all().map((row) => row.event_id);
}

const finalizeCapturingActivity = db.transaction((eventId, contentPatch, observedAt) => {
  const row = db.prepare(`
    SELECT payload FROM discord_activity_outbox
    WHERE event_id = ? AND state = 'capturing'
  `).get(eventId);

  if (!row) return false;
  const payload = parseJson(row.payload, {});
  payload.content = { ...(payload.content || {}), ...contentPatch };
  if (payload.log) payload.log.details = payload.content;
  payload.observed_at = observedAt || payload.observed_at || new Date().toISOString();

  const result = db.prepare(`
    UPDATE discord_activity_outbox
    SET payload = ?, state = 'pending', last_error = NULL, next_attempt_at = NULL
    WHERE event_id = ? AND state = 'capturing'
  `).run(JSON.stringify(payload), eventId);

  return result.changes > 0;
});

const recoverInterruptedCommands = db.transaction((now = new Date().toISOString()) => {
  const rows = db.prepare(`
    SELECT event_id, payload FROM discord_activity_outbox
    WHERE state = 'capturing' AND event_type = 'discord.slash_command.invoked'
  `).all();

  const update = db.prepare(`
    UPDATE discord_activity_outbox
    SET payload = ?, state = 'pending', last_error = NULL, next_attempt_at = NULL
    WHERE event_id = ?
  `);

  for (const row of rows) {
    const payload = parseJson(row.payload, {});
    const startedAt = Date.parse(payload.occurred_at);
    payload.observed_at = now;
    payload.content = {
      ...(payload.content || {}),
      outcome: 'interrupted',
      duration_ms: Number.isFinite(startedAt) ? Math.max(0, Date.parse(now) - startedAt) : null,
    };
    if (payload.log) payload.log.details = payload.content;
    update.run(JSON.stringify(payload), row.event_id);
  }

  return rows.map((row) => row.event_id);
});

function markActivityDelivered(eventId, deliveredAt = new Date().toISOString()) {
  db.prepare(`
    UPDATE discord_activity_outbox
    SET state = 'delivered', delivered_at = ?, next_attempt_at = NULL, last_error = NULL
    WHERE event_id = ?
  `).run(deliveredAt, eventId);
}

function markActivityAttempt(eventId, error, nextAttemptAt = null) {
  db.prepare(`
    UPDATE discord_activity_outbox
    SET attempts = attempts + 1, last_error = ?, next_attempt_at = ?
    WHERE event_id = ?
  `).run(String(error || 'Unknown delivery error').slice(0, 2000), nextAttemptAt, eventId);
}

function markActivityFailed(eventId, error) {
  db.prepare(`
    UPDATE discord_activity_outbox
    SET state = 'failed', attempts = attempts + 1, last_error = ?, next_attempt_at = NULL
    WHERE event_id = ?
  `).run(String(error || 'Permanent delivery failure').slice(0, 2000), eventId);
}

function requeueFailedActivity(eventId) {
  const result = db.prepare(`
    UPDATE discord_activity_outbox
    SET state = 'pending', attempts = 0, last_error = NULL, next_attempt_at = NULL
    WHERE event_id = ? AND state = 'failed'
  `).run(eventId);
  return result.changes > 0;
}

function cleanupDeliveredActivities(cutoff) {
  return db.prepare(`
    DELETE FROM discord_activity_outbox
    WHERE state = 'delivered' AND delivered_at < ?
  `).run(cutoff).changes;
}

function getMessageSnapshot(messageId) {
  const row = db.prepare(`
    SELECT * FROM discord_message_snapshots WHERE message_id = ?
  `).get(messageId);
  if (!row) return null;
  return { ...row, snapshot: parseJson(row.snapshot, {}) };
}

const saveMessageSnapshot = db.transaction((snapshot) => {
  const previous = getMessageSnapshot(snapshot.message_id);
  const revision = previous ? previous.revision + 1 : 1;
  const now = snapshot.observed_at || new Date().toISOString();

  db.prepare(`
    INSERT INTO discord_message_snapshots
      (message_id, guild_id, channel_id, author_id, revision, snapshot, created_at, edited_at, updated_at)
    VALUES
      (@message_id, @guild_id, @channel_id, @author_id, @revision, @snapshot, @created_at, @edited_at, @updated_at)
    ON CONFLICT(message_id) DO UPDATE SET
      guild_id = excluded.guild_id,
      channel_id = excluded.channel_id,
      author_id = excluded.author_id,
      revision = excluded.revision,
      snapshot = excluded.snapshot,
      edited_at = excluded.edited_at,
      updated_at = excluded.updated_at
  `).run({
    message_id: snapshot.message_id,
    guild_id: snapshot.guild_id,
    channel_id: snapshot.channel_id,
    author_id: snapshot.author_id,
    revision,
    snapshot: JSON.stringify({ ...snapshot, revision }),
    created_at: snapshot.created_at || now,
    edited_at: snapshot.edited_at || null,
    updated_at: now,
  });

  return {
    before: previous?.snapshot || null,
    after: { ...snapshot, revision },
  };
});

const captureMessageDeletion = db.transaction((messageId, buildActivity) => {
  const stored = getMessageSnapshot(messageId);
  const activity = buildActivity(stored?.snapshot || null);
  const inserted = insertActivity(activity);
  if (inserted.inserted) {
    db.prepare(`DELETE FROM discord_message_snapshots WHERE message_id = ?`).run(messageId);
  }
  return { ...inserted, snapshot: stored?.snapshot || null };
});

const recordAnnouncementAcknowledgment = db.transaction((announcementId, userId, buildActivity) => {
  const row = db.prepare(`
    SELECT * FROM announcement_acknowledgments WHERE announcement_id = ?
  `).get(announcementId);
  if (!row) return { recorded: false, reason: 'not-found' };

  const expectedUsers = parseJson(row.expected_users, []);
  const acknowledgedUsers = parseJson(row.acknowledged_users, []);
  if (!expectedUsers.includes(userId)) return { recorded: false, reason: 'not-required' };
  if (acknowledgedUsers.includes(userId)) return { recorded: false, reason: 'duplicate' };

  acknowledgedUsers.push(userId);
  db.prepare(`
    UPDATE announcement_acknowledgments
    SET acknowledged_users = ? WHERE announcement_id = ?
  `).run(JSON.stringify(acknowledgedUsers), announcementId);

  const activity = buildActivity({
    ...row,
    expected_users: expectedUsers,
    acknowledged_users: acknowledgedUsers,
  });
  const inserted = insertActivity(activity);
  if (!inserted.inserted) {
    throw new Error(`Failed to insert announcement activity ${activity.id}`);
  }

  return { recorded: true, eventId: activity.id, tracking: row };
});

module.exports = {
  captureMessageDeletion,
  cleanupDeliveredActivities,
  finalizeCapturingActivity,
  getActivity,
  getMessageSnapshot,
  insertActivity,
  listRecoverableActivities,
  markActivityAttempt,
  markActivityDelivered,
  markActivityFailed,
  recordAnnouncementAcknowledgment,
  recoverInterruptedCommands,
  requeueFailedActivity,
  saveMessageSnapshot,
};
