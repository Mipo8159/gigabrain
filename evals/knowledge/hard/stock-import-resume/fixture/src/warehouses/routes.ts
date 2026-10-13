import type { Router } from '../http/router.ts';
import type { AppDeps } from '../app.ts';

export function registerWarehouseRoutes(router: Router, deps: AppDeps) {
  router.get('/warehouses', async () => {
    const r = await deps.pool.query('SELECT id, name FROM warehouses ORDER BY id');
    return { status: 200, body: r.rows };
  });
}
