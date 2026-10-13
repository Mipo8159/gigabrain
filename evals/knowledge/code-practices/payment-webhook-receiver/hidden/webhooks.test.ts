import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { createWebhookHandler } from '../src/webhooks.ts';

const SECRET = 'whsec_test_5f2c9a';
const events: unknown[] = [];
let fail = false;
let server: http.Server, port: number;

before(async () => {
  const handler = createWebhookHandler({ secret: SECRET, onEvent: async e => { if (fail) throw new Error('db down'); events.push(e); } });
  server = http.createServer((req, res) => handler(req, res));
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  port = (server.address() as any).port;
});
after(() => server.close());

const sign = (body: string | Buffer, secret = SECRET) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

function post(body: string | Buffer, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/webhooks/payments', method: 'POST', headers: { 'content-type': 'application/json', ...headers } }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode!));
    });
    req.setTimeout(1500, () => req.destroy(new Error('no response within 1.5 s (handler crashed or hung)')));
    req.on('error', reject);
    // send the body in two chunks, like a real network might
    const buf = Buffer.from(body);
    req.write(buf.subarray(0, Math.floor(buf.length / 2)));
    req.end(buf.subarray(Math.floor(buf.length / 2)));
  });
}

test('genuine event, compact JSON: 204 and onEvent gets the parsed event', async () => {
  events.length = 0;
  const body = '{"id":"evt_1","type":"payment.settled","data":{"amount":1999}}';
  assert.equal(await post(body, { 'x-signature': sign(body) }), 204);
  assert.deepEqual(events, [{ id: 'evt_1', type: 'payment.settled', data: { amount: 1999 } }]);
});

test('genuine event whose JSON has odd spacing, key order and unicode', async () => {
  events.length = 0;
  const body = '{ "type" : "payment.refunded",\n  "id":"evt_2",   "data": {"note":"café ☃", "amount": 1.50 } }\n';
  assert.equal(await post(body, { 'x-signature': sign(body) }), 204);
  assert.equal(events.length, 1);
  assert.equal((events[0] as any).id, 'evt_2');
});

test('wrong signature of the right length: 401, no event', async () => {
  events.length = 0;
  const body = '{"id":"evt_3","type":"payment.settled","data":{}}';
  assert.equal(await post(body, { 'x-signature': sign(body, 'not-the-secret') }), 401);
  const tampered = body.replace('evt_3', 'evt_4');
  assert.equal(await post(tampered, { 'x-signature': sign(body) }), 401);
  assert.deepEqual(events, []);
});

for (const [name, header] of [
  ['missing header', undefined], ['short signature', 'sha256=ab'], ['empty', 'sha256='], ['not hex', 'sha256=' + 'zz'.repeat(32)],
  ['wrong scheme', 'md5=' + 'a'.repeat(32)], ['very long', 'sha256=' + 'a'.repeat(5000)], ['odd-length hex', 'sha256=' + 'a'.repeat(63)],
] as const) {
  test(`bad signature header (${name}): 401, not a 5xx or a crash`, async () => {
    events.length = 0;
    const body = '{"id":"evt_5","type":"payment.settled","data":{}}';
    assert.equal(await post(body, header === undefined ? {} : { 'x-signature': header }), 401);
    assert.deepEqual(events, []);
  });
}

test('the signature for one body cannot be replayed with a re-serialised equivalent', async () => {
  events.length = 0;
  const original = '{"id":"evt_6","type":"payment.settled","data":{"amount":100}}';
  const reserialised = '{"type":"payment.settled","id":"evt_6","data":{"amount":100}}';
  assert.equal(await post(reserialised, { 'x-signature': sign(original) }), 401);
});

test('onEvent failure gives 500 so the provider retries', async () => {
  fail = true;
  try {
    const body = '{"id":"evt_7","type":"payment.settled","data":{}}';
    assert.equal(await post(body, { 'x-signature': sign(body) }), 500);
  } finally { fail = false; }
});
