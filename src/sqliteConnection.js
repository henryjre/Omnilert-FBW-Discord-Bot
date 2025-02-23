const Database = require("better-sqlite3");
const db = new Database("./src/sqlite.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS CASE_REPORTS (
        id TEXT PRIMARY KEY,
        case_title TEXT,
        case_leader_id TEXT,
        case_thread_id TEXT
    );
`);

module.exports = db;
