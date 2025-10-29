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
    data: JSON.stringify(dataArray)
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

module.exports = {
  getNextAuditId,
  saveAuditRatings,
  getAuditRatings
};
