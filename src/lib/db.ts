import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'appointments.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT    NOT NULL,
        treatment   TEXT,
        appt_date   TEXT    NOT NULL,
        appt_time   TEXT    NOT NULL,
        confirmed   INTEGER DEFAULT 0,
        created_at  TEXT    DEFAULT (datetime('now'))
      )
    `)
  }
  return _db
}
