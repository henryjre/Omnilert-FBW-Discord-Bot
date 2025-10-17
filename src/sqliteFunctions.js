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

module.exports = {
  getNextAuditId
};
