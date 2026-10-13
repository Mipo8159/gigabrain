import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BODY = 1 << 20;

function readRaw(req: IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let n = 0;
    req.on('data', (c: Buffer) => { n += c.length; if (n > MAX_BODY) { resolve(null); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function createWebhookHandler(opts: {
  secret: string;
  onEvent(event: { id: string; type: string; data: unknown }): Promise<void>;
}): (req: IncomingMessage, res: ServerResponse) => void {
  const reply = (res: ServerResponse, status: number) => { if (!res.headersSent) res.writeHead(status).end(); };
  return (req, res) => {
    (async () => {
      const raw = await readRaw(req);
      if (!raw) return reply(res, 413);
      const header = req.headers['x-signature'];
      const m = typeof header === 'string' ? /^sha256=([0-9a-fA-F]{64})$/.exec(header.trim()) : null;
      if (!opts.secret || !m) return reply(res, 401);
      const expected = createHmac('sha256', opts.secret).update(raw).digest();
      const given = Buffer.from(m[1], 'hex');
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return reply(res, 401);
      let event: { id: string; type: string; data: unknown };
      try { event = JSON.parse(raw.toString('utf8')); } catch { return reply(res, 400); }
      try { await opts.onEvent(event); } catch { return reply(res, 500); }
      reply(res, 204);
    })().catch(() => reply(res, 500));
  };
}
