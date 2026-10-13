import { config } from './config.ts';
import { log } from './logger.ts';
import { createPool } from './db/pool.ts';
import { migrate } from './db/migrate.ts';
import { systemClock } from './clock.ts';
import { HttpPaymentsClient } from './payments/http-client.ts';
import { startScheduler } from './billing/scheduler.ts';
import { createAdminServer } from './http/admin.ts';

const pool = createPool(config.databaseUrl);
await migrate(pool);
const payments = new HttpPaymentsClient(config.pspUrl, config.pspKey);
const scheduler = startScheduler({ pool, payments, clock: systemClock }, config.cycleEveryMs);
const admin = createAdminServer(pool).listen(config.adminPort, () => log.info('admin listening', { port: config.adminPort }));

process.once('SIGTERM', async () => {
  log.info('SIGTERM: finishing the current cycle');
  admin.close();
  await scheduler.stop();
  await pool.end();
});
