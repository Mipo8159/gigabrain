import { createServer, type Server } from 'node:http';
import type pg from 'pg';
import { Router } from './http/router.ts';
import type { Redis } from './readmodel/redis.ts';
import { registerHealthRoutes } from './health/routes.ts';
import { registerCustomerRoutes } from './customers/routes.ts';
import { registerOrderRoutes } from './orders/routes.ts';

export type AppDeps = { pool: pg.Pool; redis: Redis };

/** Builds the HTTP server (not listening yet). */
export function createApp(deps: AppDeps): Server {
  const router = new Router();
  registerHealthRoutes(router, deps);
  registerCustomerRoutes(router, deps);
  registerOrderRoutes(router, deps);
  return createServer((req, res) => { void router.handle(req, res); });
}
