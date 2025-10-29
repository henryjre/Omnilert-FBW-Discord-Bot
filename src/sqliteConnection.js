const Database = require('better-sqlite3');
const db = new Database('./src/sqlite.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS CASE_REPORTS (
        id TEXT PRIMARY KEY,
        case_title TEXT,
        case_leader_id TEXT,
        case_thread_id TEXT
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS penalty_payloads (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        option TEXT,
        mode TEXT
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS pos_sessions (
        id TEXT PRIMARY KEY,
        opening_cash REAL,
        opening_pcf REAL,
        ispe_total REAL,
        topup_pcf REAL,
        closing_pcf REAL,
        cashout_deposit REAL
    );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_id_count (
    code TEXT PRIMARY KEY,
    last_id INTEGER NOT NULL
  );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS vnr_id_count (
      id INTEGER PRIMARY KEY AUTOINCREMENT
    )
  `);

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_ratings (
    discord_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    last_updated TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
