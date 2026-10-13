import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { createDynamoClient } from '../src/db.ts';

// A fake DynamoDB endpoint. mode 'hang': accept the request and never answer. mode 'slow-ok': answer after 200 ms.
let mode: 'hang' | 'slow-ok' = 'hang';
let attempts = 0;
const open = new Set<http.ServerResponse>();
const srv = http.createServer((req, res) => {
  attempts++;
  req.resume();
  open.add(res);
  res.on('close', () => open.delete(res));
  if (mode === 'slow-ok') {
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'application/x-amz-json-1.0' });
      res.end(JSON.stringify({ Item: { pk: { S: 'cart-1' } } }));
    }, 200);
  }
});
let endpoint = '';
before(async () => {
  await new Promise<void>(r => srv.listen(0, '127.0.0.1', r));
  endpoint = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
});
after(() => { for (const r of open) r.destroy(); srv.closeAllConnections(); srv.close(); });

const client = () => createDynamoClient({
  region: 'eu-west-1', endpoint, credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
});
const get = (c: ReturnType<typeof createDynamoClient>) =>
  c.send(new GetItemCommand({ TableName: 'carts', Key: { pk: { S: 'cart-1' } } }));

test('normal calls still succeed', async () => {
  mode = 'slow-ok'; attempts = 0;
  const out = await get(client());
  assert.equal(out.Item?.pk?.S, 'cart-1');
});

test('a hung endpoint makes the call fail fast instead of hanging', async () => {
  mode = 'hang'; attempts = 0;
  const t0 = Date.now();
  const outcome = await Promise.race([
    get(client()).then(() => 'resolved', (e: Error) => `rejected:${e.name}`),
    new Promise<string>(r => setTimeout(() => r('still hanging'), 2500).unref()),
  ]);
  const ms = Date.now() - t0;
  assert.match(outcome, /^rejected/, `after ${ms} ms the call was ${outcome}`);
  assert.ok(ms < 2000, `took ${ms} ms`);
  assert.ok(attempts >= 1 && attempts <= 2, `made ${attempts} attempts`);
});
