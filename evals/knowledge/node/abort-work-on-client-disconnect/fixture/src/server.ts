import http from 'node:http';
import { buildReport } from './report.ts';

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/reports') {
      res.statusCode = 404;
      res.end();
      return;
    }
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
      const report = await buildReport(params);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(report));
    } catch (err) {
      res.statusCode = 500;
      res.end('report failed');
    }
  });
}
