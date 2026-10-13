import type { RedisClientType } from 'redis';

const escapeGlob = (s: string) => s.replace(/[*?[\]\\]/g, (c) => '\\' + c);

// Removes every key whose name starts with `prefix`. Resolves to the number of keys removed.
export async function invalidatePrefix(client: RedisClientType, prefix: string): Promise<number> {
  let removed = 0;
  let cursor = '0';
  do {
    const r = await client.scan(cursor, { MATCH: escapeGlob(prefix) + '*', COUNT: 1000 });
    cursor = r.cursor; // a string in node-redis v5+
    if (r.keys.length) removed += await client.unlink(r.keys);
  } while (cursor !== '0');
  return removed;
}
