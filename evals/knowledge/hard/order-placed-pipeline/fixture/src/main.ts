import { config } from './config.ts';
import { log } from './logger.ts';
import { createPool } from './db/pool.ts';
import { migrate } from './db/migrate.ts';
import { createRedis } from './readmodel/redis.ts';
import { createKafka } from './kafka.ts';
import { createApp } from './app.ts';
import { startRelay } from './outbox/relay.ts';
import { startOrderProjector } from './projector/order-projector.ts';

const pool = createPool(config.databaseUrl);
await migrate(pool);
const redis = await createRedis(config.redisUrl);
const kafka = createKafka();
const producer = kafka.producer();
await producer.connect();

const server = createApp({ pool, redis }).listen(config.port, () => log.info('listening', { port: config.port }));
const relay = startRelay(pool, producer, config.relayIntervalMs);
const projector = await startOrderProjector({ kafka, redis, topic: config.orderEventsTopic, groupId: config.projectorGroupId });

process.once('SIGTERM', async () => {
  server.close();
  await relay.stop();
  await projector.stop();
  await producer.disconnect();
  await redis.quit();
  await pool.end();
});
