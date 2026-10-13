import { DatabaseSync } from 'node:sqlite';

export type Product = { id: number; name: string; price_cents: number; created_at: string };

export function openDb(file = ':memory:'): DatabaseSync {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      created_at  TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY, secret TEXT NOT NULL);
  `);
  return db;
}
