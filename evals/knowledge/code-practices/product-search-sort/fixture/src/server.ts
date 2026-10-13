import { createServer } from 'node:http';
import { openDb } from './db.ts';
import { searchProducts } from './products.ts';
import { ValidationError } from './errors.ts';

const db = openDb(process.env.DB_FILE ?? 'shop.db');

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (req.method !== 'GET' || url.pathname !== '/products') return void res.writeHead(404).end();
  const p = url.searchParams;
  try {
    const items = searchProducts(db, { q: p.get('q') ?? undefined, sort: p.get('sort') ?? undefined, dir: p.get('dir') ?? undefined });
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ items }));
  } catch (e) {
    if (e instanceof ValidationError) return void res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }));
    res.writeHead(500).end();
  }
}).listen(Number(process.env.PORT ?? 3000));
