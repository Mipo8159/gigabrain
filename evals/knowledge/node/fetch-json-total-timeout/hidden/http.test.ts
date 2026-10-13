import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetchJson } from '../src/http.ts';

let server: http.Server;
let base: string;
const timers = new Set<NodeJS.Timeout>();

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/prices') {
      res.setHeader('content-type', 'application/json');
      return void res.end(JSON.stringify({ sku: 'A1', price: 42 }));
    }
    if (req.url === '/503') { res.statusCode = 503; return void res.end('{}'); }
    if (req.url === '/stall-headers') return; // never answers
    if (req.url === '/trickle') {
      // headers right away, then the body one byte every 100 ms, never finishing
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"items":[');
      const iv = setInterval(() => res.write(' '), 100);
      timers.add(iv);
      res.on('close', () => { clearInterval(iv); timers.delete(iv); });
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  for (const t of timers) clearInterval(t);
  server.closeAllConnections();
  server.close();
});

async function settleTime(p: Promise<unknown>, capMs: number): Promise<{ ms: number; outcome: 'resolved' | 'rejected' | 'pending' }> {
  const t = performance.now();
  let cap: NodeJS.Timeout | undefined;
  const outcome = await Promise.race([
    p.then(() => 'resolved' as const, () => 'rejected' as const),
    new Promise<'pending'>((r) => { cap = setTimeout(() => r('pending'), capMs); }),
  ]);
  clearTimeout(cap);
  return { ms: performance.now() - t, outcome };
}

test('returns parsed JSON', async () => {
  assert.deepEqual(await fetchJson(`${base}/prices`, { timeoutMs: 1000 }), { sku: 'A1', price: 42 });
});

test('rejects on non-2xx', async () => {
  await assert.rejects(fetchJson(`${base}/503`, { timeoutMs: 1000 }));
});

test('rejects promptly when the server never answers', async () => {
  const r = await settleTime(fetchJson(`${base}/stall-headers`, { timeoutMs: 300 }), 2000);
  assert.equal(r.outcome, 'rejected');
  assert.ok(r.ms < 1200, `took ${r.ms.toFixed(0)} ms for a 300 ms timeout`);
});

test('rejects promptly when the body stalls after the headers', async () => {
  const r = await settleTime(fetchJson(`${base}/trickle`, { timeoutMs: 300 }), 2000);
  assert.equal(r.outcome, 'rejected', `still ${r.outcome} after ${r.ms.toFixed(0)} ms with a 300 ms timeout`);
  assert.ok(r.ms < 1200, `took ${r.ms.toFixed(0)} ms for a 300 ms timeout`);
});
