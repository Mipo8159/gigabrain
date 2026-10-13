import { config } from '../config.ts';
import { createPool } from '../db/pool.ts';
import { migrate } from '../db/migrate.ts';
import { HttpObjectStorage } from '../storage/http-storage.ts';
import { workOnce } from './worker.ts';

const pool = createPool(config.databaseUrl, 4);
await migrate(pool);
const storage = new HttpObjectStorage(config.storageBaseUrl, config.storageToken);
let stopping = false;
process.once('SIGTERM', () => { stopping = true; });
while (!stopping) {
  const id = await workOnce({ pool, storage }).catch((e) => { console.error(e); return null; });
  if (!id) await new Promise((r) => setTimeout(r, config.workerPollMs));
}
await pool.end();
