// Hidden tests for INV-233. Happy paths first, then one test per trap (named "trap: ...").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import pg from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { createImport } from '../src/imports/repo.ts';
import { runImport } from '../src/imports/run-import.ts';

const URL_ = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString: URL_, max: 5 });

type File = { data?: Buffer; gen?: () => AsyncGenerator<Buffer>; chunk: number };
const files = new Map<string, File>();
function* split(b: Buffer, n: number) { for (let i = 0; i < b.length; i += n) yield b.subarray(i, i + n); }
// A byte stream like an object-store body: Buffers of `chunk` bytes, cut anywhere.
const storage = {
  async open(key: string) {
    const f = files.get(key);
    if (!f) throw new Error(`no object ${key}`);
    if (f.gen) return Readable.from(f.gen(), { objectMode: false, highWaterMark: 16 * 1024 });
    return Readable.from(split(f.data!, f.chunk), { objectMode: false, highWaterMark: 1 });
  },
  async size(key: string) { const f = files.get(key); return f?.data ? f.data.length : f ? 1 : null; },
};

let seq = 0;
async function newImport(content: string | Buffer, chunk = 64 * 1024) {
  const key = `wh-hidden/${Date.now()}-${++seq}.csv`;
  files.set(key, { data: Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'), chunk });
  return createImport(pool, { warehouseId: 'wh-hidden', fileKey: key });
}
const csvField = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
async function stockOf(prefix: string) {
  const r = await pool.query<{ sku: string; stock: string; name: string }>(
    'SELECT sku, stock::text, name FROM products WHERE sku LIKE $1', [`${prefix}%`]);
  return new Map(r.rows.map((x) => [x.sku, { stock: Number(x.stock), name: x.name }]));
}
async function job(id: string) {
  return (await pool.query('SELECT status, rows_done::int AS "rowsDone", rows_failed::int AS "rowsFailed" FROM imports WHERE id = $1', [id])).rows[0];
}

before(async () => {
  await migrate(pool);
  await pool.query(`INSERT INTO warehouses (id, name) VALUES ('wh-hidden', 'Hidden') ON CONFLICT DO NOTHING`);
});
after(async () => { await pool.end(); });

test('happy: applies an Excel export (quoted fields, CRLF, invalid rows) and reports progress', async () => {
  await pool.query(`INSERT INTO products (sku, name, stock) VALUES ('hp-0001', 'Old name', 100), ('hp-0002', 'Keep me', 50)`);
  const lines = ['sku,name,delta'];
  for (let i = 1; i <= 2345; i++) {
    const sku = `hp-${String(i).padStart(4, '0')}`;
    if (i === 3) { lines.push(',Nameless,4'); continue; }
    if (i === 1500) { lines.push(`hp-1500,Broken,abc`); continue; }
    if (i === 1) { lines.push(`${sku},${csvField('Bolt, M8 "heavy"\r\nzinc')},-30`); continue; }
    if (i === 2) { lines.push(`${sku},,7`); continue; }
    lines.push(`${sku},${i % 2 ? '' : `Item ${i}`},${i % 5}`);
  }
  const id = await newImport(lines.join('\r\n') + '\r\n');
  const progress: number[] = [];
  const res = await runImport({ pool, storage } as any, id, { onProgress: (p) => progress.push(p.rowsDone) });
  assert.deepEqual({ rowsDone: res.rowsDone, rowsFailed: res.rowsFailed }, { rowsDone: 2345, rowsFailed: 2 });
  const s = await stockOf('hp-');
  assert.deepEqual(s.get('hp-0001'), { stock: 70, name: 'Bolt, M8 "heavy"\r\nzinc' });
  assert.deepEqual(s.get('hp-0002'), { stock: 57, name: 'Keep me' });
  assert.deepEqual(s.get('hp-0004'), { stock: 4, name: 'Item 4' });
  assert.deepEqual(s.get('hp-0005'), { stock: 0, name: 'hp-0005' });
  assert.equal(s.has('hp-1500'), false);
  assert.equal(s.size, 2345 - 2);
  const errs = await pool.query('SELECT record::int FROM import_errors WHERE import_id = $1 ORDER BY record', [id]);
  assert.deepEqual(errs.rows.map((r) => r.record), [3, 1500]);
  assert.deepEqual(await job(id), { status: 'done', rowsDone: 2345, rowsFailed: 2 });
  assert.ok(progress.includes(1000) && progress.includes(2000), `progress after each batch, got ${progress}`);
  assert.equal(progress.at(-1), 2345);
});

test('happy: running a finished import again changes nothing', async () => {
  const id = await newImport('sku,name,delta\nagain-1,Again,5\n');
  await runImport({ pool, storage } as any, id);
  await runImport({ pool, storage } as any, id);
  assert.equal((await stockOf('again-')).get('again-1')?.stock, 5);
});

test('trap: a worker killed at any point resumes and applies every row exactly once', { timeout: 120_000 }, async () => {
  const N = 3500;
  const makeCsv = (p: string) => {
    const lines = ['sku,name,delta'];
    for (let i = 0; i < N; i++) lines.push(`${p}${i},Part ${i},${(i % 7) - 2}`);
    return lines.join('\n') + '\n';
  };
  const expected = (i: number) => (i < 300 ? 1000 : 0) + (i % 7) - 2;
  const seed = (p: string) => pool.query(
    `INSERT INTO products (sku, name, stock) SELECT $1 || g, 'Part ' || g, 1000 FROM generate_series(0, 299) g`, [p]);

  // Wraps a pool: queries 1..k run normally; from k+1 on, the process is "dead" (nothing reaches Postgres).
  function crashing(real: pg.Pool, k: number, log?: string[]) {
    let n = 0;
    const q = (target: any) => (...args: any[]) => {
      const text = typeof args[0] === 'string' ? args[0] : args[0]?.text ?? '';
      if (n >= k) return Promise.reject(new Error('worker killed'));
      n++;
      log?.push(text.trim().split(/\s+/)[0].toUpperCase());
      return target.query(...args);
    };
    const wrap = (t: any): any => new Proxy(t, {
      get(target, prop) {
        if (prop === 'query') return q(target);
        if (prop === 'connect') return async () => {
          if (n >= k) throw new Error('worker killed');
          return wrap(await target.connect());
        };
        const v = target[prop];
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
    return wrap(real);
  }
  const withTimeout = <T,>(p: Promise<T>, ms: number) =>
    Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

  // 1. A clean run, to learn where the transaction boundaries are.
  const ops: string[] = [];
  const p0 = `crash-x-`;
  await seed(p0);
  const id0 = await newImport(makeCsv(p0));
  const real0 = new pg.Pool({ connectionString: URL_, max: 5 });
  await runImport({ pool: crashing(real0, Infinity, ops), storage } as any, id0);
  await real0.end();
  const total = ops.length;
  const ks = new Set<number>();
  ops.forEach((op, i) => { if (op === 'COMMIT' || op === 'BEGIN' || op === 'UPDATE') { ks.add(i + 1); ks.add(i + 2); } });
  for (let k = 1; k < total; k += Math.max(1, Math.floor(total / 15))) ks.add(k);
  const points = [...ks].filter((k) => k >= 1 && k < total).sort((a, b) => a - b).slice(0, 80);

  // 2. Kill the worker after k queries, then let a new worker run the same import to the end.
  for (const k of points) {
    const p = `crash-${k}-`;
    await seed(p);
    const id = await newImport(makeCsv(p));
    const app = `hidden-crash-${k}`;
    const dead = new pg.Pool({ connectionString: URL_, max: 5, application_name: app });
    dead.on('error', () => {});
    dead.on('connect', (c) => c.on('error', () => {}));
    await withTimeout(runImport({ pool: crashing(dead, k), storage } as any, id).catch(() => {}), 5000);
    // The pod is gone: its connections drop and Postgres rolls back whatever was open.
    await pool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = $1', [app]);
    await withTimeout(dead.end().catch(() => {}), 2000);

    const fresh = new pg.Pool({ connectionString: URL_, max: 5 });
    try {
      await runImport({ pool: fresh, storage } as any, id);
    } finally {
      await fresh.end();
    }
    const s = await stockOf(p);
    const wrong: string[] = [];
    for (let i = 0; i < N && wrong.length < 3; i++) {
      const got = s.get(`${p}${i}`)?.stock;
      if (got !== expected(i)) wrong.push(`${p}${i}: stock ${got}, expected ${expected(i)}`);
    }
    assert.deepEqual(wrong, [], `killed after query #${k} of ${total} (${ops[k - 1]}), then resumed`);
    assert.equal((await job(id)).rowsDone, N);
  }
});

test('trap: the same SKU twice within one batch', async () => {
  await pool.query(`INSERT INTO products (sku, name, stock) VALUES ('dup-B', 'Gadget', 10)`);
  const id = await newImport('sku,name,delta\ndup-A,Widget,5\ndup-B,,1\ndup-A,,3\ndup-C,C,1\ndup-A,Widget v2,-2\ndup-B,Gadget,1\n');
  const res = await runImport({ pool, storage } as any, id);
  assert.equal(res.rowsDone, 6);
  const s = await stockOf('dup-');
  assert.deepEqual(s.get('dup-A'), { stock: 6, name: 'Widget v2' });
  assert.deepEqual(s.get('dup-B'), { stock: 12, name: 'Gadget' });
  assert.equal(s.get('dup-C')?.stock, 1);
});

test('trap: multi-byte names split across network chunks', async () => {
  const names = ['Crème brûlée', 'Größe XL – Übergröße', '東京タワー模型', 'ქართული ენა', '📦 Box, "big"\nline 2'];
  const csv = 'sku,name,delta\r\n' + names.map((n, i) => `utf-${i},${csvField(n)},${i + 1}`).join('\r\n') + '\r\n';
  const id = await newImport(csv, 5); // the body arrives in 5-byte pieces
  await runImport({ pool, storage } as any, id);
  const s = await stockOf('utf-');
  assert.deepEqual(names.map((_, i) => s.get(`utf-${i}`)?.name), names);
  assert.deepEqual(names.map((_, i) => s.get(`utf-${i}`)?.stock), [1, 2, 3, 4, 5]);
});

test('trap: a large file is applied while it streams, not after it was read', { timeout: 120_000 }, async () => {
  const N = 100_000;
  const key = `wh-hidden/big-${Date.now()}.csv`;
  const seen: { atHalf?: number } = {};
  let id = '';
  files.set(key, {
    chunk: 0,
    gen: async function* () {
      yield Buffer.from('sku,name,delta\n');
      for (let i = 0; i < N; i += 200) {
        if (i === N / 2) {
          seen.atHalf = (await pool.query('SELECT rows_done::int AS n FROM imports WHERE id = $1', [id])).rows[0].n;
        }
        let s = '';
        for (let j = i; j < i + 200; j++) s += `big-${j},Bulk item ${j},1\n`;
        yield Buffer.from(s);
      }
    },
  });
  id = await createImport(pool, { warehouseId: 'wh-hidden', fileKey: key });
  const res = await runImport({ pool, storage } as any, id);
  assert.equal(res.rowsDone, N);
  assert.ok((seen.atHalf ?? 0) >= 1000,
    `when half of the file had been read, ${seen.atHalf} rows were applied: the whole file is buffered in memory first`);
  const n = await pool.query(`SELECT count(*)::int AS n, sum(stock)::int AS s FROM products WHERE sku LIKE 'big-%'`);
  assert.deepEqual(n.rows[0], { n: N, s: N });
});
