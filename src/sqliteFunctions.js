const db = require('./sqliteConnection');

const getNextAuditId = db.transaction((code) => {
  const upsertCounter = db.prepare(`
        INSERT INTO audit_id_count(code, last_id)
        VALUES (?, 0)
        ON CONFLICT(code) DO UPDATE SET last_id = last_id + 1
        RETURNING last_id;
      `);

  const row = upsertCounter.get(code);
  return row.last_id;
});

module.exports = {
  getNextAuditId
};
