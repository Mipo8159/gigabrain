import { createServer } from 'node:http';
import { openDb } from './db.ts';
import { listEvents } from './events.ts';

const db = openDb(process.env.DB_FILE ?? 'feed.db');

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (req.method === 'GET' && url.pathname === '/events') {
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const page = listEvents(db, { limit, cursor: url.searchParams.get('cursor') });
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(page));
    return;
  }
  res.writeHead(404).end();
}).listen(Number(process.env.PORT ?? 3000));
