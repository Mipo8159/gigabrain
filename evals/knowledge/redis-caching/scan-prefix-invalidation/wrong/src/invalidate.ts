import type { RedisClientType } from 'redis';

const escapeGlob = (s: string) => s.replace(/[*?[\]\\]/g, (c) => '\\' + c);

// Removes every key whose name starts with `prefix`. Resolves to the number of keys removed.
// Uses SCAN rather than KEYS so we never block the shared instance.
export async function invalidatePrefix(client: RedisClientType, prefix: string): Promise<number> {
  const match = escapeGlob(prefix) + '*';
  let removed = 0;
  let cursor = '0';
  for (;;) {
    const { cursor: next, keys } = await client.scan(cursor, { MATCH: match });
    if (keys.length === 0) break;
    removed += await client.unlink(keys);
    if (next === '0') break;
    cursor = next;
  }
  return removed;
}
