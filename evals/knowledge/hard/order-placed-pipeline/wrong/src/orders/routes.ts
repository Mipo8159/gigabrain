import type { Router } from '../http/router.ts';
import type { AppDeps } from '../app.ts';
import { HttpError } from '../http/errors.ts';
import { markOrderPaid } from './pay.ts';
import { placeOrder } from './place.ts';
import { parsePlaceOrder } from './validate.ts';
import { loadOrderView } from './repo.ts';
import { readView, storeView } from '../readmodel/view-store.ts';

export function registerOrderRoutes(router: Router, deps: AppDeps) {
  router.post('/orders', async (ctx) => {
    const key = ctx.header('idempotency-key');
    if (!key || key.length > 200) throw new HttpError(400, 'Idempotency-Key header is required');
    const input = parsePlaceOrder(await ctx.body());
    const { view } = await placeOrder(deps.pool, key, input);
    return { status: 201, body: view };
  });

  router.get('/orders/:id', async ({ params }) => {
    const cached = await readView(deps.redis, params.id);
    if (cached) return { status: 200, body: cached };
    const view = await loadOrderView(deps.pool, params.id);
    if (!view) throw new HttpError(404, 'order not found');
    await storeView(deps.redis, view);
    return { status: 200, body: view };
  });

  // Payment provider webhook (signature checked at the edge proxy).
  router.post('/orders/:id/pay', async ({ params }) => {
    const view = await markOrderPaid(deps.pool, params.id);
    return { status: 200, body: view };
  });
}
