import http from 'node:http';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createApp(): http.Server {
  return http.createServer(async (req, res) => {
    if (req.url === '/slow') {
      // stands in for a slow downstream call
      await sleep(500);
      res.end('done');
      return;
    }
    if (req.url === '/health') {
      res.end('ok');
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  });
}
