import { createServer, type Server } from 'node:http';
import { Router } from './http/router.ts';
import { healthRoutes } from './health.ts';
import { projectRoutes } from './projects/routes.ts';

export function createApp(): Server {
  const router = new Router();
  healthRoutes(router);
  projectRoutes(router);
  return createServer(router.handle);
}
