import { DatabaseSync } from 'node:sqlite';

export type EventRow = { id: number; type: string; actor: string; created_at: string };

// created_at is an ISO-8601 UTC string with second precision, e.g. '2026-10-01T12:00:00Z'.
export function openDb(file = ':memory:'): DatabaseSync {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL,
      actor      TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_created_at ON events (created_at);
  `);
  return db;
}

export function insertEvent(db: DatabaseSync, e: Omit<EventRow, 'id'>): number {
  const r = db.prepare('INSERT INTO events (type, actor, created_at) VALUES (?, ?, ?)').run(e.type, e.actor, e.created_at);
  return Number(r.lastInsertRowid);
}
