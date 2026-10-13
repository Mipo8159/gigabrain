import type { IncomingMessage, ServerResponse } from 'node:http';

export function createWebhookHandler(opts: {
  secret: string;
  onEvent(event: { id: string; type: string; data: unknown }): Promise<void>;
}): (req: IncomingMessage, res: ServerResponse) => void {
  return (_req, res) => {
    res.statusCode = 501;
    res.end('not implemented');
  };
}
