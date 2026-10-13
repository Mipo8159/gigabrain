import { createServer, type Server } from 'node:http';
import type pg from 'pg';
import { listInvoices } from '../invoices/repo.ts';
import { getSubscription } from '../subscriptions/repo.ts';

/** Internal admin API (behind the VPN): health and a subscription's invoices. */
export function createAdminServer(pool: pg.Pool): Server {
  return createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      const url = new URL(req.url ?? '/', 'http://admin');
      if (url.pathname === '/healthz') return send(200, { ok: true });
      const m = /^\/subscriptions\/(\d+)\/invoices$/.exec(url.pathname);
      if (req.method === 'GET' && m) {
        if (!(await getSubscription(pool, m[1]))) return send(404, { error: 'not found' });
        return send(200, await listInvoices(pool, m[1]));
      }
      send(404, { error: 'not found' });
    } catch (e) {
      send(500, { error: String(e) });
    }
  });
}
