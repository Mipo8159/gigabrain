import type { AddressInfo } from 'node:net';
import { createPool } from '../src/db/pool.ts';
import { migrate } from '../src/db/migrate.ts';
import { createRedis } from '../src/readmodel/redis.ts';
import { createApp } from '../src/app.ts';

/** Boots the app against DATABASE_URL / REDIS_URL on a random port. */
export async function startTestApp() {
  const pool = createPool(process.env.DATABASE_URL!);
  await migrate(pool);
  const redis = await createRedis(process.env.REDIS_URL!);
  const server = createApp({ pool, redis });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    pool, redis, base,
    async close() {
      await new Promise((r) => server.close(r));
      await redis.quit();
      await pool.end();
    },
  };
}

export async function seedCustomer(pool: import('pg').Pool, id: string) {
  await pool.query('INSERT INTO customers (id, name, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, `Customer ${id}`, `${id}@example.com`]);
}
