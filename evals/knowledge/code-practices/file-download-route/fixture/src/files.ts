import type { IncomingMessage, ServerResponse } from 'node:http';

export function createFilesHandler(uploadsDir: string): (req: IncomingMessage, res: ServerResponse) => void {
  return (_req, res) => {
    res.statusCode = 501;
    res.end('not implemented');
  };
}
