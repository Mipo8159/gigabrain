function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`missing env ${name}`);
  return v;
}

export const config = {
  port: Number(env('PORT', '3000')),
  databaseUrl: env('DATABASE_URL', 'postgres://postgres:pg@127.0.0.1:5432/orders'),
  redisUrl: env('REDIS_URL', 'redis://127.0.0.1:6379'),
  kafkaBrokers: env('KAFKA_BROKERS', 'localhost:9092').split(','),
  orderEventsTopic: env('ORDER_EVENTS_TOPIC', 'orders.events'),
  projectorGroupId: env('PROJECTOR_GROUP_ID', 'orders-read-model'),
  relayIntervalMs: Number(env('RELAY_INTERVAL_MS', '200')),
};
