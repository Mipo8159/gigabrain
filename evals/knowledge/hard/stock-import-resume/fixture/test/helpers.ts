import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createPool } from '../src/db/pool.ts';
import { migrate } from '../src/db/migrate.ts';
import { LocalObjectStorage } from '../src/storage/local-storage.ts';

export async function testDeps() {
  const pool = createPool(process.env.DATABASE_URL!);
  await migrate(pool);
  await pool.query(`INSERT INTO warehouses (id, name) VALUES ('wh-test', 'Test') ON CONFLICT DO NOTHING`);
  const root = mkdtempSync(join(tmpdir(), 'inv-storage-'));
  const storage = new LocalObjectStorage(root);
  const put = (key: string, content: string | Buffer) => {
    mkdirSync(dirname(join(root, key)), { recursive: true });
    writeFileSync(join(root, key), content);
  };
  return { pool, storage, put };
}
