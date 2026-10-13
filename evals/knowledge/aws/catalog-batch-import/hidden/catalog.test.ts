import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDynamo } from './fake-ddb.ts';

const fake = new FakeDynamo({ products: ['sku'] });
let importProducts: typeof import('../src/catalog.ts').importProducts;

before(async () => {
  await fake.start();
  process.env.PRODUCTS_TABLE = 'products';
  ({ importProducts } = await import('../src/catalog.ts'));
});
after(() => fake.stop());
beforeEach(() => fake.reset());

// Throttling as BatchWriteItem reports it: HTTP 200, some writes handed back in UnprocessedItems.
// Every 3rd write is refused the first two times it is offered.
function throttle() {
  const offered = new Map<string, number>();
  let n = 0;
  fake.hook = (op, req) => {
    if (op !== 'BatchWriteItem') return undefined;
    const keep: Record<string, any[]> = {}, back: Record<string, any[]> = {};
    for (const [t, reqs] of Object.entries<any[]>(req.RequestItems)) {
      if (reqs.length > 25 || new Set(reqs.map(r => fake.keyOf(t, r.PutRequest?.Item ?? r.DeleteRequest?.Key))).size !== reqs.length) return undefined; // let the fake reject it
      for (const r of reqs) {
        const k = fake.keyOf(t, r.PutRequest?.Item ?? r.DeleteRequest?.Key);
        const seen = offered.get(k) ?? 0;
        offered.set(k, seen + 1);
        const refuse = seen < 2 && (n++ % 3 === 0);
        (refuse ? (back[t] ??= []) : (keep[t] ??= [])).push(r);
      }
    }
    for (const [t, reqs] of Object.entries(keep)) for (const r of reqs) fake.seed(t, r.PutRequest.Item);
    return { body: { UnprocessedItems: back } };
  };
}

const product = (i: number, v = 1) => ({ sku: `SKU-${String(i).padStart(3, '0')}`, name: `Product ${i} v${v}`, priceCents: 100 * i + v, stock: v });

test('writes every product even when DynamoDB hands writes back as unprocessed', async () => {
  throttle();
  const products = Array.from({ length: 60 }, (_, i) => product(i));
  await importProducts(products);
  const stored = fake.all('products');
  assert.equal(stored.length, 60, `stored ${stored.length} of 60`);
  for (const p of products) {
    const s = fake.get('products', { sku: { S: p.sku } });
    assert.equal(s?.name?.S, p.name);
  }
});

test('repeated SKUs: the later row wins and the import does not fail', async () => {
  throttle();
  const products = Array.from({ length: 30 }, (_, i) => product(i));
  products.splice(5, 0, product(20, 0));   // early stale copy of SKU-020
  products.push(product(3, 2));            // later update of SKU-003
  await importProducts(products);
  assert.equal(fake.all('products').length, 30);
  assert.equal(fake.get('products', { sku: { S: 'SKU-003' } })?.name?.S, 'Product 3 v2');
  assert.equal(fake.get('products', { sku: { S: 'SKU-020' } })?.name?.S, 'Product 20 v1');
});

test('uses batches, never more than 25 writes per request', async () => {
  throttle();
  await importProducts(Array.from({ length: 60 }, (_, i) => product(i)));
  const batches = fake.calls.filter(c => c.op === 'BatchWriteItem');
  assert.ok(batches.length >= 3, `expected BatchWriteItem calls, saw ${fake.calls.map(c => c.op).join(',')}`);
  for (const b of batches) {
    const n = Object.values<any[]>(b.req.RequestItems).reduce((a, r) => a + r.length, 0);
    assert.ok(n <= 25, `batch of ${n}`);
  }
});
