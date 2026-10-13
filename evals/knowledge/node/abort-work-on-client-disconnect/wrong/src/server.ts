import http from 'node:http';
import { buildReport } from './report.ts';

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/reports') {
      res.statusCode = 404;
      res.end();
      return;
    }
    const controller = new AbortController();
    req.on('aborted', () => controller.abort());
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let params: { days?: number };
    try {
      params = JSON.parse(raw || '{}');
    } catch {
      res.statusCode = 400;
      res.end('bad json');
      return;
    }
    try {
      const report = await buildReport(params, controller.signal);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(report));
    } catch (err) {
      if (controller.signal.aborted) return;
      res.statusCode = 500;
      res.end('report failed');
    }
  });
}
