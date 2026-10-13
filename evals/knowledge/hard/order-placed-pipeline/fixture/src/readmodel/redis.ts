import { createClient } from 'redis';

export type Redis = ReturnType<typeof createClient>;

export async function createRedis(url: string): Promise<Redis> {
  const client = createClient({ url });
  client.on('error', (e) => console.error('redis error', e));
  await client.connect();
  return client;
}
