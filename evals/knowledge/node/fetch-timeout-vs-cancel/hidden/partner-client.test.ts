import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { getText } from '../src/partner-client.ts';

let server: http.Server;
let base: string;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/ok') return void res.end('hello');
    if (req.url === '/500') { res.statusCode = 500; return void res.end('boom'); }
    if (req.url === '/hang') return; // never responds
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

async function freePort(): Promise<number> {
  const s = net.createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const p = (s.address() as AddressInfo).port;
  await new Promise<void>((r) => s.close(() => r()));
  return p;
}

test('2xx returns the body', async () => {
  assert.deepEqual(await getText(`${base}/ok`, { timeoutMs: 2000 }), { status: 'ok', body: 'hello' });
});

test('non-2xx is an error', async () => {
  const r = await getText(`${base}/500`, { timeoutMs: 2000 });
  assert.equal(r.status, 'error');
});

test('server that never answers is a timeout, reported promptly', async () => {
  const t = performance.now();
  const r = await getText(`${base}/hang`, { timeoutMs: 200 });
  const ms = performance.now() - t;
  assert.equal(r.status, 'timeout');
  assert.ok(ms < 1500, `took ${ms.toFixed(0)} ms for a 200 ms timeout`);
});

test('timeout also applies when the caller passes its own signal', async () => {
  const ac = new AbortController();
  const r = await getText(`${base}/hang`, { timeoutMs: 200, signal: ac.signal });
  assert.equal(r.status, 'timeout');
});

test('caller abort is a cancellation, not a timeout', async () => {
  const ac = new AbortController();
  setTimeout(() => ac.abort(), 100);
  const t = performance.now();
  const r = await getText(`${base}/hang`, { timeoutMs: 5000, signal: ac.signal });
  assert.equal(r.status, 'cancelled');
  assert.ok(performance.now() - t < 1500);
});

test('connection refused is an error', async () => {
  const p = await freePort();
  const r = await getText(`http://127.0.0.1:${p}/x`, { timeoutMs: 2000 });
  assert.equal(r.status, 'error');
});
