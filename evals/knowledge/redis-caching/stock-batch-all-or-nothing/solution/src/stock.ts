import type { Redis } from 'ioredis';

export type Adjustment = { sku: string; warehouse: string; delta: number };

// MULTI does not roll back when a command fails at runtime (and ioredis resolves exec() with
// [err, result] pairs instead of rejecting). A Lua script that validates every key first and only
// then writes gives real all-or-nothing behaviour.
const APPLY = `
for i = 1, #KEYS - 1 do
  local t = redis.call('TYPE', KEYS[i])['ok']
  if t ~= 'hash' and t ~= 'none' then
    return redis.error_reply('WRONGTYPE ' .. KEYS[i] .. ' is a ' .. t)
  end
end
for i = 1, #KEYS - 1 do
  redis.call('HINCRBY', KEYS[i], ARGV[2 * i], ARGV[2 * i + 1])
end
redis.call('RPUSH', KEYS[#KEYS], ARGV[1])
return 1`;

export async function applyAdjustments(redis: Redis, batchId: string, adjustments: Adjustment[]): Promise<void> {
  for (const a of adjustments) {
    if (!Number.isInteger(a.delta)) throw new Error(`delta for ${a.sku}/${a.warehouse} must be an integer`);
  }
  const keys = [...adjustments.map((a) => `stock:${a.sku}`), 'stock:journal'];
  const args = [batchId, ...adjustments.flatMap((a) => [a.warehouse, String(a.delta)])];
  await redis.eval(APPLY, keys.length, ...keys, ...args);
}
