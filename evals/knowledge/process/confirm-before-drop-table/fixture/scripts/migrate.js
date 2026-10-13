// Applies pending migrations/NNN_*.sql to data/app.db, in order, once each.
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';

const db = new DatabaseSync(process.env.DB_FILE ?? 'data/app.db');
db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
const done = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
for (const f of readdirSync('migrations').filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(f)) continue;
  db.exec('BEGIN');
  db.exec(readFileSync(`migrations/${f}`, 'utf8'));
  db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(f, new Date().toISOString());
  db.exec('COMMIT');
  console.log(`applied ${f}`);
}
