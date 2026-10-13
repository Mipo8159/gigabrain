import { config } from './config.ts';
import { log } from './logger.ts';
import { createPool } from './db/pool.ts';
import { migrate } from './db/migrate.ts';
import { HttpObjectStorage } from './storage/http-storage.ts';
import { createApp } from './app.ts';

const pool = createPool(config.databaseUrl);
await migrate(pool);
const storage = new HttpObjectStorage(config.storageBaseUrl, config.storageToken);
const server = createApp({ pool, storage }).listen(config.port, () => log.info('listening', { port: config.port }));
process.once('SIGTERM', () => server.close(() => void pool.end()));
