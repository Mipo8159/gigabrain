import type { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export function createFilesHandler(uploadsDir: string): (req: IncomingMessage, res: ServerResponse) => void {
  const root = path.resolve(uploadsDir);

  return (req, res) => {
    const notFound = () => { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); };

    const pathname = (req.url ?? '').split('?')[0];
    if (req.method !== 'GET' || !pathname.startsWith('/files/')) return notFound();

    let name: string;
    try {
      name = decodeURIComponent(pathname.slice('/files/'.length));
    } catch {
      return notFound();
    }
    if (!name || name.includes('\0')) return notFound();

    const full = path.resolve(root, name);
    if (!full.startsWith(root)) return notFound();

    stat(full).then(s => {
      if (!s.isFile()) return notFound();
      res.writeHead(200, {
        'content-type': CONTENT_TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream',
        'content-length': s.size,
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(full))}`,
      });
      createReadStream(full).on('error', () => res.destroy()).pipe(res);
    }, notFound);
  };
}
