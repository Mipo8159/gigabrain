import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppError, BadRequestError, NotFoundError, ValidationError } from './errors.ts';
import { log } from '../lib/log.ts';

export interface Ctx {
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
  userId: string | null;
}
/** A handler returns the response body (status 200), or `{ status, body }` via `reply()`. */
export type Handler = (ctx: Ctx) => Promise<unknown> | unknown;

const REPLY = Symbol('reply');
export const reply = (status: number, body: unknown) => ({ [REPLY]: true, status, body });

interface Route { method: string; parts: string[]; handler: Handler }

export class Router {
  private routes: Route[] = [];

  on(method: string, path: string, handler: Handler): this {
    this.routes.push({ method, parts: path.split('/').filter(Boolean), handler });
    return this;
  }
  get(p: string, h: Handler) { return this.on('GET', p, h); }
  post(p: string, h: Handler) { return this.on('POST', p, h); }
  patch(p: string, h: Handler) { return this.on('PATCH', p, h); }
  delete(p: string, h: Handler) { return this.on('DELETE', p, h); }

  private match(method: string, path: string) {
    const segs = path.split('/').filter(Boolean);
    for (const r of this.routes) {
      if (r.method !== method || r.parts.length !== segs.length) continue;
      const params: Record<string, string> = {};
      if (r.parts.every((p, i) => (p.startsWith(':') ? ((params[p.slice(1)] = decodeURIComponent(segs[i])), true) : p === segs[i]))) {
        return { route: r, params };
      }
    }
    return null;
  }

  /** The one place errors become HTTP responses. */
  handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let status = 200;
    let body: unknown;
    try {
      const url = new URL(req.url ?? '/', 'http://local');
      const m = this.match(req.method ?? 'GET', url.pathname);
      if (!m) throw new NotFoundError(`route ${req.method} ${url.pathname}`);
      const out = await m.route.handler({
        params: m.params,
        query: url.searchParams,
        body: await readJson(req),
        userId: (req.headers['x-user-id'] as string) ?? null,
      });
      if (out && typeof out === 'object' && REPLY in out) ({ status, body } = out as any);
      else body = out;
    } catch (err) {
      if (err instanceof AppError) {
        status = err.status;
        body = { error: { code: err.code, message: err.message, ...(err instanceof ValidationError ? { fields: err.fields } : {}) } };
      } else {
        log.error('unhandled error', { err: String((err as Error)?.stack ?? err), url: req.url });
        status = 500;
        body = { error: { code: 'internal', message: 'internal error' } };
      }
    }
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (!chunks.length) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new BadRequestError('body is not valid JSON');
  }
}
