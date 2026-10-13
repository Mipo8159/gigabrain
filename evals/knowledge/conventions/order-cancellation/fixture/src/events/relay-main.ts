import pg from 'pg';
import { relayOutbox } from './outbox.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
// setBus(brokerBus) happens here in the deployed image.
for (;;) {
  const n = await relayOutbox(pool).catch((e) => { console.error('relay failed', e); return 0; });
  if (n === 0) await new Promise((r) => setTimeout(r, 500));
}
