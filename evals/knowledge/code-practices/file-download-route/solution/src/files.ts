import type { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const types: Record<string, string> = { '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv', '.png': 'image/png', '.jpg': 'image/jpeg' };

function safeName(raw: string): string | null {
  let name: string;
  try { name = decodeURIComponent(raw); } catch { return null; }
  if (name === '' || name === '.' || name === '..' || /[\/\\\0]/.test(name)) return null;
  return name;
}

export function createFilesHandler(uploadsDir: string): (req: IncomingMessage, res: ServerResponse) => void {
  const root = path.resolve(uploadsDir);
  return (req, res) => {
    const notFound = () => { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); };
    const pathname = (req.url ?? '').split('?')[0];
    if (req.method !== 'GET' || !pathname.startsWith('/files/')) return notFound();
    const name = safeName(pathname.slice('/files/'.length));
    if (!name) return notFound();
    const full = path.resolve(root, name);
    if (path.dirname(full) !== root) return notFound();
    stat(full).then(s => {
      if (!s.isFile()) return notFound();
      res.writeHead(200, {
        'content-type': types[path.extname(name).toLowerCase()] ?? 'application/octet-stream',
        'content-length': s.size,
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      });
      createReadStream(full).on('error', () => res.destroy()).pipe(res);
    }, notFound);
  };
}
