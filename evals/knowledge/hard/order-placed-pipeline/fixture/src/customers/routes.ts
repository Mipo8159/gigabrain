import type { Router } from '../http/router.ts';
import type { AppDeps } from '../app.ts';
import { HttpError } from '../http/errors.ts';
import { getCustomer, listCustomerOrderIds } from './repo.ts';

export function registerCustomerRoutes(router: Router, deps: AppDeps) {
  router.get('/customers/:id', async ({ params }) => {
    const c = await getCustomer(deps.pool, params.id);
    if (!c) throw new HttpError(404, 'customer not found');
    return { status: 200, body: c };
  });

  router.get('/customers/:id/orders', async ({ params }) => {
    if (!(await getCustomer(deps.pool, params.id))) throw new HttpError(404, 'customer not found');
    return { status: 200, body: { orderIds: await listCustomerOrderIds(deps.pool, params.id) } };
  });
}
