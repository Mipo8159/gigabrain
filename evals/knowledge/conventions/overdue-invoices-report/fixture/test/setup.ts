import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createPool } from '../src/db/pool.ts';

/** Fresh schema; returns a superuser pool (setup only) and an app_user pool (what the API uses). */
export async function setupDb() {
  const admin = createPool();
  await admin.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user LOGIN PASSWORD 'app'; END IF;
  END $$;`).catch(() => {});
  await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO app_user;');
  await admin.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await admin.query(`INSERT INTO tenants VALUES (1, 'Acme'), (2, 'Globex')`);
  const url = new URL(process.env.DATABASE_URL!);
  url.username = 'app_user';
  url.password = 'app';
  const app = createPool(url.toString());
  return { admin, app, close: async () => { await app.end(); await admin.end(); } };
}
