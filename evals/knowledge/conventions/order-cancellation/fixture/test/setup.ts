import { readFileSync } from 'node:fs';
import pg from 'pg';
import { setBus, type DomainEvent } from '../src/events/bus.ts';

export async function setupDb() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await pool.query(`INSERT INTO customers(email, name) VALUES ('ana@example.com', 'Ana')`);
  await pool.query(`INSERT INTO products VALUES ('MUG', 'Mug', 900, 10), ('TEE', 'T-shirt', 2500, 5)`);
  return pool;
}

/** In-memory bus; flip `down` to simulate a broker outage. */
export function memoryBus() {
  const events: DomainEvent[] = [];
  const bus = {
    down: false,
    events,
    async publish(e: DomainEvent) {
      if (bus.down) throw new Error('broker unavailable');
      events.push(e);
    },
  };
  setBus(bus);
  return bus;
}
