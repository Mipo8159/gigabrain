import type { Router } from './http/router.ts';

export function healthRoutes(r: Router): void {
  r.get('/healthz', () => ({ ok: true, uptime: process.uptime() }));
}
