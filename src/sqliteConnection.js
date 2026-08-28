const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
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

db.exec(`
  CREATE TABLE IF NOT EXISTS attendance_records (
    discord_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    last_updated TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS thread_approvals (
    thread_id TEXT PRIMARY KEY,
    parent_channel_id TEXT NOT NULL,
    starter_message_id TEXT NOT NULL,
    current_approvals INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS announcement_acknowledgments (
    announcement_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    expected_users TEXT NOT NULL,
    acknowledged_users TEXT DEFAULT '[]',
    timeout_minutes INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS portal_notifications (
    notification_id TEXT PRIMARY KEY,
    recipient_user_id TEXT,
    discord_user_id TEXT NOT NULL,
    title TEXT,
    message TEXT,
    type TEXT,
    color TEXT,
    link_url TEXT,
    dm_channel_id TEXT,
    message_id TEXT,
    status TEXT DEFAULT 'unread',
    created_at TEXT,
    last_updated TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS meeting_voice_channels (
    meeting_id TEXT PRIMARY KEY,
    voice_channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    payload TEXT,
    empty_since TEXT,
    empty_version INTEGER DEFAULT 0,
    finished_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_updated TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS technology_ticket_counters (
    year INTEGER PRIMARY KEY,
    last_number INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS technology_tickets (
    ticket_id TEXT PRIMARY KEY,
    sequence_year INTEGER NOT NULL,
    sequence_number INTEGER NOT NULL,
    guild_id TEXT NOT NULL,
    parent_channel_id TEXT NOT NULL,
    thread_id TEXT UNIQUE,
    initial_message_id TEXT,
    closure_message_id TEXT,
    requester_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Technology Support Request',
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    status TEXT NOT NULL DEFAULT 'CREATING',
    assigned_to_id TEXT,
    resolved_by_id TEXT,
    closed_by_id TEXT,
    resolution TEXT,
    first_response_at TEXT,
    first_responder_id TEXT,
    created_at TEXT NOT NULL,
    closed_at TEXT,
    reopened_at TEXT,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    is_urgent INTEGER NOT NULL DEFAULT 0,
    urgency_reason TEXT,
    urgent_at TEXT,
    urgent_by_id TEXT,
    urgency_count INTEGER NOT NULL DEFAULT 0,
    failed_reason TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS technology_tickets_requester_status_idx
    ON technology_tickets(requester_id, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS technology_tickets_thread_idx
    ON technology_tickets(thread_id);
  CREATE INDEX IF NOT EXISTS technology_tickets_created_idx
    ON technology_tickets(created_at);

  CREATE TABLE IF NOT EXISTS technology_ticket_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_id TEXT,
    credited_staff_id TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY(ticket_id) REFERENCES technology_tickets(ticket_id)
  );

  CREATE INDEX IF NOT EXISTS technology_ticket_events_ticket_idx
    ON technology_ticket_events(ticket_id, created_at);
  CREATE INDEX IF NOT EXISTS technology_ticket_events_type_time_idx
    ON technology_ticket_events(event_type, created_at);

  CREATE TABLE IF NOT EXISTS technology_ticket_config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    panel_message_id TEXT,
    updated_at TEXT NOT NULL
  );
`);

for (const migration of [
  `ALTER TABLE technology_tickets ADD COLUMN closure_message_id TEXT`,
  `ALTER TABLE technology_tickets ADD COLUMN closed_by_id TEXT`,
  `ALTER TABLE technology_tickets ADD COLUMN is_urgent INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE technology_tickets ADD COLUMN urgency_reason TEXT`,
  `ALTER TABLE technology_tickets ADD COLUMN urgent_at TEXT`,
  `ALTER TABLE technology_tickets ADD COLUMN urgent_by_id TEXT`,
  `ALTER TABLE technology_tickets ADD COLUMN urgency_count INTEGER NOT NULL DEFAULT 0`,
]) {
  try {
    db.exec(migration);
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) throw error;
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT,
    channel_id TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS pending_branch_creations (
    token TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS department_voice_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    department_id INTEGER NOT NULL,
    thread_id TEXT NOT NULL,
    voice_channel_id TEXT NOT NULL,
    date_key TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    paused INTEGER DEFAULT 0,
    paused_at TEXT,
    paused_channel_id TEXT,
    remaining_seconds INTEGER,
    timer_version INTEGER DEFAULT 0,
    check_in_at TEXT NOT NULL,
    check_out_at TEXT,
    last_update_at TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id, date_key)
  )
`);

// Idempotent migration: add the color column to pre-existing tables.
try {
  db.exec(`ALTER TABLE portal_notifications ADD COLUMN color TEXT`);
} catch (e) {
  // Column already exists; ignore.
}

for (const migration of [
  `ALTER TABLE department_voice_sessions ADD COLUMN paused INTEGER DEFAULT 0`,
  `ALTER TABLE department_voice_sessions ADD COLUMN paused_at TEXT`,
  `ALTER TABLE department_voice_sessions ADD COLUMN paused_channel_id TEXT`,
  `ALTER TABLE department_voice_sessions ADD COLUMN remaining_seconds INTEGER`,
  `ALTER TABLE meeting_voice_channels ADD COLUMN empty_since TEXT`,
  `ALTER TABLE meeting_voice_channels ADD COLUMN empty_version INTEGER DEFAULT 0`,
  `ALTER TABLE meeting_voice_channels ADD COLUMN finished_at TEXT`,
]) {
  try {
    db.exec(migration);
  } catch (e) {
    // Column already exists; ignore.
  }
}

try {
  const departmentsPath = path.join(__dirname, 'config', 'departments.json');
  if (fs.existsSync(departmentsPath)) {
    const departments = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
    const insertBranch = db.prepare(`
      INSERT OR IGNORE INTO branches (id, name, role)
      VALUES (@id, @name, @role)
    `);

    const seedBranches = db.transaction((items) => {
      for (const item of items) {
        if (!item || !Number.isInteger(Number(item.id)) || !item.name) continue;
        insertBranch.run({
          id: Number(item.id),
          name: item.name,
          role: item.role || null,
        });
      }
    });

    seedBranches(Array.isArray(departments) ? departments : []);
  }
} catch (e) {
  console.error('Failed to seed branches from departments.json:', e.message);
}

module.exports = db;
