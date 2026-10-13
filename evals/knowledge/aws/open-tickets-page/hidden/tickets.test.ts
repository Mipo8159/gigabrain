import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDynamo } from './fake-ddb.ts';

// 12 tickets for tenant t1, 4 open; plus another tenant that must never show up.
const OPEN = new Set(['04', '06', '07', '12']);
const ids = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const row = (tenant: string, id: string, status: string) => ({
  pk: { S: `TENANT#${tenant}` }, sk: { S: `TICKET#${id}` }, ticketId: { S: id },
  subject: { S: `subject ${id}` }, status: { S: status },
});

const fake = new FakeDynamo({ tickets: ['pk', 'sk'] });
let listOpenTickets: typeof import('../src/tickets.ts').listOpenTickets;

// Query semantics that matter here: a page evaluates at most min(Limit, 3) items (3 stands in for the 1 MB cap),
// the filter runs after that, and LastEvaluatedKey is the key of the last *evaluated* item.
function queryHook(op: string, req: any) {
  if (op !== 'Query') return undefined;
  const pkVal = Object.values<any>(req.ExpressionAttributeValues ?? {}).find(v => v.S?.startsWith('TENANT#'))?.S;
  let rows = fake.all('tickets').filter(r => r.pk.S === pkVal).sort((a, b) => a.sk.S.localeCompare(b.sk.S));
  if (req.ScanIndexForward === false) rows.reverse();
  if (req.ExclusiveStartKey) {
    const i = rows.findIndex(r => r.pk.S === req.ExclusiveStartKey.pk?.S && r.sk.S === req.ExclusiveStartKey.sk?.S);
    if (i < 0) return FakeDynamo.error('ValidationException', 'The provided starting key is invalid');
    rows = rows.slice(i + 1);
  }
  const cap = Math.min(req.Limit ?? Infinity, 3);
  const evaluated = rows.slice(0, cap);
  const items = req.FilterExpression ? evaluated.filter(r => r.status.S === 'OPEN') : evaluated;
  const last = evaluated.at(-1);
  const more = rows.length > evaluated.length;
  return { body: { Items: items, Count: items.length, ScannedCount: evaluated.length,
    ...(more && last ? { LastEvaluatedKey: { pk: last.pk, sk: last.sk } } : {}) } };
}

before(async () => {
  await fake.start();
  process.env.TICKETS_TABLE = 'tickets';
  ({ listOpenTickets } = await import('../src/tickets.ts'));
});
after(() => fake.stop());
beforeEach(() => {
  fake.reset();
  for (const id of ids) fake.seed('tickets', row('t1', id, OPEN.has(id) ? 'OPEN' : 'CLOSED'));
  for (const id of ids) fake.seed('tickets', row('t2', id, 'OPEN'));
  fake.hook = queryHook;
});

async function walk(limit: number) {
  const pages: string[][] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 20; guard++) {
    const page = await listOpenTickets('t1', { limit, cursor });
    assert.ok(page.items.length <= limit, `page of ${page.items.length} > limit ${limit}`);
    for (const t of page.items) assert.equal(t.status, 'OPEN');
    pages.push(page.items.map(t => t.ticketId));
    if (!page.nextCursor) return pages;
    cursor = page.nextCursor;
  }
  assert.fail('pagination never ended');
}

test('first page is full even though the first DynamoDB pages hold no open tickets', async () => {
  const page = await listOpenTickets('t1', { limit: 2 });
  assert.deepEqual(page.items.map(t => t.ticketId), ['04', '06']);
  assert.ok(page.nextCursor);
});

for (const limit of [1, 2, 3, 5]) {
  test(`walking all pages with limit ${limit} returns every open ticket exactly once, in order`, async () => {
    const pages = await walk(limit);
    assert.deepEqual(pages.flat(), ['04', '06', '07', '12']);
    for (const p of pages.slice(0, -1)) assert.equal(p.length, limit, `short page before the end: ${JSON.stringify(pages)}`);
  });
}
