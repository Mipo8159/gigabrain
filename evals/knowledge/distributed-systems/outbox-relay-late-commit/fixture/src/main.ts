import pg from 'pg';
import { migrate } from './outbox.ts';
import { createRelay } from './relay.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await migrate(pool);

const relay = createRelay({
  pool,
  publish: async (e) => { console.log('publish', e.id, e.type); }, // the Kafka producer is wired in by the platform
});

setInterval(() => { relay.pollOnce().catch((err) => console.error('relay poll failed', err)); }, 200);
