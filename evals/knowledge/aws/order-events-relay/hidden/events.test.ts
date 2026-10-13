import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// Fake EventBridge (AWS JSON 1.1). PutEvents semantics kept: <= 10 entries or the whole call is rejected;
// HTTP 200 with per-entry ErrorCode for entries that failed, in request order.
type Entry = { Source: string; DetailType: string; Detail: string; EventBusName: string };
let delivered: Entry[] = [];
let calls: number[] = [];
let decide: (e: Entry, attempt: number) => string | undefined = () => undefined;
const attempts = new Map<string, number>();

const srv = http.createServer(async (req, res) => {
  let raw = '';
  for await (const c of req) raw += c;
  const body = JSON.parse(raw || '{}');
  const reply = (status: number, b: unknown) => { res.writeHead(status, { 'content-type': 'application/x-amz-json-1.1' }); res.end(JSON.stringify(b)); };
  if (!String(req.headers['x-amz-target']).endsWith('PutEvents')) return reply(400, { __type: 'ValidationException', message: 'fake: PutEvents only' });
  const entries: Entry[] = body.Entries ?? [];
  calls.push(entries.length);
  if (entries.length < 1 || entries.length > 10) return reply(400, { __type: 'ValidationException', message: '1 validation error detected: Entries must have length less than or equal to 10' });
  let failedCount = 0;
  const results = entries.map(e => {
    const id = JSON.parse(e.Detail).id;
    const n = (attempts.get(id) ?? 0) + 1;
    attempts.set(id, n);
    const code = decide(e, n);
    if (code) { failedCount++; return { ErrorCode: code, ErrorMessage: code }; }
    delivered.push(e);
    return { EventId: `evt-${id}-${n}` };
  });
  reply(200, { FailedEntryCount: failedCount, Entries: results });
});

let publishOrderEvents: typeof import('../src/events.ts').publishOrderEvents;
before(async () => {
  await new Promise<void>(r => srv.listen(0, '127.0.0.1', r));
  Object.assign(process.env, {
    AWS_ENDPOINT_URL_EVENTBRIDGE: `http://127.0.0.1:${(srv.address() as AddressInfo).port}`,
    AWS_ACCESS_KEY_ID: 'AKIDEXAMPLE', AWS_SECRET_ACCESS_KEY: 'secret', AWS_REGION: 'eu-west-1',
    AWS_CONFIG_FILE: '/nonexistent', AWS_SHARED_CREDENTIALS_FILE: '/nonexistent', AWS_EC2_METADATA_DISABLED: 'true',
    ORDER_EVENTS_BUS: 'orders-bus',
  });
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_ENDPOINT_URL;
  ({ publishOrderEvents } = await import('../src/events.ts'));
});
after(() => { srv.closeAllConnections(); srv.close(); });
beforeEach(() => { delivered = []; calls = []; attempts.clear(); decide = () => undefined; });

const ev = (i: number) => ({ id: `e${i}`, type: 'OrderPlaced' as const, orderId: `o${i}`, payload: { total: i } });
const deliveredIds = () => delivered.map(d => JSON.parse(d.Detail).id as string);

test('35 events: all delivered once, shaped as agreed', async () => {
  const events = Array.from({ length: 35 }, (_, i) => ev(i));
  const out = await publishOrderEvents(events);
  assert.deepEqual([...out.published].sort(), events.map(e => e.id).sort());
  assert.deepEqual(out.failed, []);
  assert.deepEqual([...deliveredIds()].sort(), events.map(e => e.id).sort());
  const d = delivered.find(x => JSON.parse(x.Detail).id === 'e3')!;
  assert.equal(d.Source, 'shop.orders');
  assert.equal(d.DetailType, 'OrderPlaced');
  assert.equal(d.EventBusName, 'orders-bus');
  assert.deepEqual(JSON.parse(d.Detail), { id: 'e3', orderId: 'o3', total: 3 });
});

test('throttled entries are published once and nothing is sent twice', async () => {
  // Every 4th event is throttled on its first attempt.
  decide = (e, attempt) => (attempt === 1 && Number(JSON.parse(e.Detail).id.slice(1)) % 4 === 0 ? 'ThrottlingException' : undefined);
  const events = Array.from({ length: 23 }, (_, i) => ev(i));
  const out = await publishOrderEvents(events);
  const ids = deliveredIds();
  assert.equal(new Set(ids).size, ids.length, `delivered twice: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);
  // Every event lands in exactly one list, and the lists tell the truth.
  assert.deepEqual([...out.published, ...out.failed].sort(), events.map(e => e.id).sort());
  assert.deepEqual([...out.published].sort(), [...ids].sort());
});

test('an entry that keeps failing is reported failed, the rest published', async () => {
  decide = e => (JSON.parse(e.Detail).id === 'e5' ? 'InternalFailure' : undefined);
  const events = Array.from({ length: 12 }, (_, i) => ev(i));
  const out = await publishOrderEvents(events);
  assert.deepEqual(out.failed, ['e5']);
  assert.deepEqual([...out.published].sort(), events.filter(e => e.id !== 'e5').map(e => e.id).sort());
  const ids = deliveredIds();
  assert.equal(new Set(ids).size, ids.length, 'an event was delivered twice');
  assert.ok(!ids.includes('e5'));
});
