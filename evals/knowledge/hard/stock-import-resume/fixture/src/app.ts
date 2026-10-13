import { createServer, type Server } from 'node:http';
import type pg from 'pg';
import { Router } from './http/router.ts';
import type { ObjectStorage } from './storage/types.ts';
import { registerImportRoutes } from './imports/routes.ts';
import { registerProductRoutes } from './products/routes.ts';
import { registerWarehouseRoutes } from './warehouses/routes.ts';

export type AppDeps = { pool: pg.Pool; storage: ObjectStorage };

export function createApp(deps: AppDeps): Server {
  const router = new Router();
  router.get('/healthz', async () => { await deps.pool.query('SELECT 1'); return { status: 200, body: { ok: true } }; });
  registerImportRoutes(router, deps);
  registerProductRoutes(router, deps);
  registerWarehouseRoutes(router, deps);
  return createServer((req, res) => { void router.handle(req, res); });
}
