import type { Router } from '../http/router.ts';
import type { AppDeps } from '../app.ts';
import { markOrderPaid } from './pay.ts';

export function registerOrderRoutes(router: Router, deps: AppDeps) {
  // Payment provider webhook (signature checked at the edge proxy).
  router.post('/orders/:id/pay', async ({ params }) => {
    const view = await markOrderPaid(deps.pool, params.id);
    return { status: 200, body: view };
  });
}
