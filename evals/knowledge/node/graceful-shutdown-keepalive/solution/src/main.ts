import { createApp } from './app.ts';

const server = createApp();
let stopping = false;

server.on('request', (_req, res) => {
  res.on('finish', () => {
    if (stopping) setImmediate(() => server.closeIdleConnections());
  });
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  const addr = server.address();
  console.log(`listening ${typeof addr === 'object' && addr ? addr.port : ''}`);
});

process.on('SIGTERM', () => {
  if (stopping) return;
  stopping = true;
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10_000).unref();
});
