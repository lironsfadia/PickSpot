import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

let databaseInstance;

function initialiseDatabase() {
  if (databaseInstance) return databaseInstance;
  const dataDirectory = join(process.cwd(), "data");
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(join(dataDirectory, "seat-hub.db"));
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'owner')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    map_path TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    zone TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, label)
  );

  CREATE TABLE IF NOT EXISTS seat_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    blocked_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT,
    blocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unblocked_at TEXT,
    unblocked_by INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    reserved_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TEXT,
    cancelled_reason TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_user_booking
    ON bookings(user_id, reserved_date) WHERE cancelled_at IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_seat_booking
    ON bookings(seat_id, reserved_date) WHERE cancelled_at IS NULL;

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  `);
  databaseInstance = database;
  return database;
}

// Route modules are evaluated in parallel during a production build. A lazy
// proxy keeps SQLite from being opened until an API route actually handles a request.
const database = new Proxy({}, {
  get(_target, property) {
    const value = initialiseDatabase()[property];
    return typeof value === "function" ? value.bind(initialiseDatabase()) : value;
  },
});

export default database;
