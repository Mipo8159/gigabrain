import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { testDeps } from './helpers.ts';
import { getProduct, listLowStock } from '../src/products/repo.ts';

let deps: Awaited<ReturnType<typeof testDeps>>;
before(async () => { deps = await testDeps(); });
after(async () => { await deps.pool.end(); });

test('products: lookup and low stock', async () => {
  await deps.pool.query(`INSERT INTO products (sku, name, stock) VALUES ('T-LOW', 'Low', 2), ('T-HIGH', 'High', 500)
    ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock`);
  assert.deepEqual(await getProduct(deps.pool, 'T-LOW'), { sku: 'T-LOW', name: 'Low', stock: 2 });
  const low = await listLowStock(deps.pool, 10);
  assert.ok(low.some((p) => p.sku === 'T-LOW'));
  assert.ok(!low.some((p) => p.sku === 'T-HIGH'));
});
