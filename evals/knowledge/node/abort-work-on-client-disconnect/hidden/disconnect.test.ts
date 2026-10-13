import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServer } from '../src/server.ts';
import { stats } from '../src/report.ts';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let server: http.Server;
let port: number;

before(async () => {
  server = createServer();
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

function post(body: string): { req: http.ClientRequest; done: Promise<{ status: number; body: string }> } {
  const req = http.request({ host: '127.0.0.1', port, path: '/reports', method: 'POST', agent: false,
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } });
  const done = new Promise<{ status: number; body: string }>((resolve, reject) => {
    req.on('response', (res) => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode!, body: b }));
    });
    req.on('error', reject);
  });
  req.end(body);
  return { req, done };
}

async function waitFor(pred: () => boolean, ms: number) {
  const end = Date.now() + ms;
  while (!pred() && Date.now() < end) await sleep(10);
}

test('a client that stays connected gets its report and nothing is aborted', async () => {
  const s0 = { ...stats };
  const r = await post(JSON.stringify({ days: 3 })).done;
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), { days: 3, rows: 30 });
  assert.equal(stats.aborted - s0.aborted, 0, 'work was aborted although the client was still connected');
  assert.equal(stats.completed - s0.completed, 1);
});

test('a client that disconnects mid-report cancels the work', async () => {
  const s0 = { ...stats };
  const { req, done } = post(JSON.stringify({ days: 5 }));
  done.catch(() => {});
  await sleep(100);
  assert.equal(stats.started - s0.started, 1, 'report should have started');
  req.destroy();
  await waitFor(() => stats.aborted - s0.aborted === 1 || stats.completed - s0.completed === 1, 1000);
  assert.equal(stats.aborted - s0.aborted, 1, 'report work kept running after the client disconnected');
  assert.equal(stats.completed - s0.completed, 0);
});

test('server keeps serving after a disconnect', async () => {
  const r = await post('{}').done;
  assert.equal(r.status, 200);
});
