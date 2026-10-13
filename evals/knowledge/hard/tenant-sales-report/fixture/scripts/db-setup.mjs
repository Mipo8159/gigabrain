// Applies db/schema.sql and creates the app's login role. Run with a superuser DATABASE_URL.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(`DO $$ BEGIN
    CREATE ROLE app_rw LOGIN PASSWORD 'app_rw' NOSUPERUSER NOBYPASSRLS;
  EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL; END $$`);
  await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
                      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_rw`);
  console.log('db ready');
} finally {
  await client.end();
}
