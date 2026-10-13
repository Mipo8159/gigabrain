import { createServer } from 'node:http';
import { createWebhookHandler } from './webhooks.ts';
import { recordPaymentEvent } from './payments.ts';

const webhooks = createWebhookHandler({ secret: process.env.PAYMENTS_WEBHOOK_SECRET ?? '', onEvent: recordPaymentEvent });

createServer((req, res) => {
  if (req.url === '/webhooks/payments' && req.method === 'POST') return webhooks(req, res);
  res.writeHead(404).end();
}).listen(Number(process.env.PORT ?? 3000));
