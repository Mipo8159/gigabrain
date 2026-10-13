import type { Redis } from './redis.ts';
import { orderViewKey, ORDER_VIEW_TTL_SECONDS } from './keys.ts';
import type { OrderView } from '../orders/types.ts';

// Writes the view only if it is newer than what the read model already holds. Both writers (the projector
// and the GET fill from Postgres) go through this, so neither can put an older version back.
const SET_IF_NEWER = `
local cur = redis.call('GET', KEYS[1])
if cur then
  local ok, doc = pcall(cjson.decode, cur)
  if ok and type(doc) == 'table' and tonumber(doc.version) and tonumber(doc.version) >= tonumber(ARGV[2]) then
    return 0
  end
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
return 1`;

export async function storeViewIfNewer(redis: Redis, view: OrderView): Promise<boolean> {
  const r = await redis.eval(SET_IF_NEWER, {
    keys: [orderViewKey(view.id)],
    arguments: [JSON.stringify(view), String(view.version), String(ORDER_VIEW_TTL_SECONDS)],
  });
  return Number(r) === 1;
}

export async function readView(redis: Redis, orderId: string): Promise<OrderView | null> {
  const raw = await redis.get(orderViewKey(orderId));
  return raw ? (JSON.parse(raw) as OrderView) : null;
}
