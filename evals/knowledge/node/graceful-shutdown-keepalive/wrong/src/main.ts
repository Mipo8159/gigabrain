import { createApp } from './app.ts';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = createApp();
server.listen(Number(process.env.PORT ?? 3000), () => {
  const addr = server.address();
  console.log(`listening ${typeof addr === 'object' && addr ? addr.port : ''}`);
});

let shuttingDown = false;

process.on('SIGTERM', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('SIGTERM received, draining connections');
  server.close((err) => {
    if (err) {
      console.error('error while closing server', err);
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => {
    console.error('graceful shutdown timed out, forcing exit');
    server.closeAllConnections();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
});
