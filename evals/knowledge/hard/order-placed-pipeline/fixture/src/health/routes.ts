import type { Router } from '../http/router.ts';
import type { AppDeps } from '../app.ts';

export function registerHealthRoutes(router: Router, deps: AppDeps) {
  router.get('/healthz', async () => {
    await deps.pool.query('SELECT 1');
    await deps.redis.ping();
    return { status: 200, body: { ok: true } };
  });
}
