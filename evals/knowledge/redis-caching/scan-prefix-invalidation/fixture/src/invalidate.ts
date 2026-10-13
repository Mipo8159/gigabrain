import type { RedisClientType } from 'redis';

// Removes every key whose name starts with `prefix`. Resolves to the number of keys removed.
export async function invalidatePrefix(client: RedisClientType, prefix: string): Promise<number> {
  throw new Error('not implemented');
}
