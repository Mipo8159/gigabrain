import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BODY_BYTES = 1024 * 1024;

type PaymentEvent = { id: string; type: string; data: unknown };

function readJson(req: IncomingMessage): Promise<PaymentEvent> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) req.destroy(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function verifySignature(secret: string, payload: string, header: string | string[] | undefined): boolean {
  if (typeof header !== 'string') return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!m) return false;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const given = Buffer.from(m[1], 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createWebhookHandler(opts: {
  secret: string;
  onEvent(event: { id: string; type: string; data: unknown }): Promise<void>;
}): (req: IncomingMessage, res: ServerResponse) => void {
  const reply = (res: ServerResponse, status: number) => { if (!res.headersSent) res.writeHead(status).end(); };

  return (req, res) => {
    (async () => {
      let event: PaymentEvent;
      try {
        event = await readJson(req);
      } catch {
        return reply(res, 400);
      }

      if (!opts.secret || !verifySignature(opts.secret, JSON.stringify(event), req.headers['x-signature'])) {
        return reply(res, 401);
      }

      try {
        await opts.onEvent(event);
      } catch {
        return reply(res, 500);
      }
      reply(res, 204);
    })().catch(() => reply(res, 500));
  };
}
