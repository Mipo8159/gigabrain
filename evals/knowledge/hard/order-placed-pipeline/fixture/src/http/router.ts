import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from './errors.ts';
import { readJson } from './body.ts';
import { log } from '../logger.ts';

export type Ctx = {
  req: IncomingMessage;
  params: Record<string, string>;
  query: URLSearchParams;
  /** Lower-case header lookup; first value if repeated. */
  header(name: string): string | undefined;
  /** Parsed JSON body (read once, cached). */
  body(): Promise<unknown>;
};

export type Reply = { status: number; body?: unknown; headers?: Record<string, string> };
export type Handler = (ctx: Ctx) => Promise<Reply>;

type Route = { method: string; re: RegExp; keys: string[]; handler: Handler };

export class Router {
  private routes: Route[] = [];

  add(method: string, pattern: string, handler: Handler): this {
    const keys: string[] = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.routes.push({ method, re, keys, handler });
    return this;
  }

  get(p: string, h: Handler) { return this.add('GET', p, h); }
  post(p: string, h: Handler) { return this.add('POST', p, h); }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://local');
    let reply: Reply;
    try {
      const route = this.routes.find((r) => r.method === req.method && r.re.test(url.pathname));
      if (!route) throw new HttpError(404, 'not found');
      const m = route.re.exec(url.pathname)!;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      let body: Promise<unknown> | undefined;
      reply = await route.handler({
        req, params, query: url.searchParams,
        header: (n) => { const v = req.headers[n.toLowerCase()]; return Array.isArray(v) ? v[0] : v; },
        body: () => (body ??= readJson(req)),
      });
    } catch (e) {
      if (e instanceof HttpError) {
        reply = { status: e.status, body: { error: e.message, details: e.details } };
      } else {
        log.error('unhandled', { err: String((e as Error)?.stack ?? e), path: url.pathname });
        reply = { status: 500, body: { error: 'internal error' } };
      }
    }
    const payload = reply.body === undefined ? '' : JSON.stringify(reply.body);
    res.writeHead(reply.status, { 'content-type': 'application/json', ...reply.headers });
    res.end(payload);
  }
}
