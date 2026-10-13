import type { Router } from '../http/router.ts';
import type { AppDeps } from '../app.ts';
import { HttpError } from '../http/errors.ts';
import { getProduct, listLowStock } from './repo.ts';

export function registerProductRoutes(router: Router, deps: AppDeps) {
  router.get('/products/low-stock', async ({ query }) => {
    const below = Number(query.get('below') ?? '10');
    if (!Number.isSafeInteger(below)) throw new HttpError(400, 'below must be an integer');
    return { status: 200, body: await listLowStock(deps.pool, below) };
  });

  router.get('/products/:sku', async ({ params }) => {
    const p = await getProduct(deps.pool, params.sku);
    if (!p) throw new HttpError(404, 'product not found');
    return { status: 200, body: p };
  });
}
