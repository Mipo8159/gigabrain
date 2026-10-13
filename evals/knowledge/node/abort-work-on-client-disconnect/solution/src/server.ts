import http from 'node:http';
import { buildReport } from './report.ts';

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/reports') {
      res.statusCode = 404;
      res.end();
      return;
    }
    const ac = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) ac.abort();
    });
    let raw = '';
    try {
      for await (const chunk of req) raw += chunk;
    } catch {
      return;
    }
    let params: { days?: number };
    try {
      params = JSON.parse(raw || '{}');
    } catch {
      res.statusCode = 400;
      res.end('bad json');
      return;
    }
    try {
      const report = await buildReport(params, ac.signal);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(report));
    } catch (err) {
      if (ac.signal.aborted) return;
      res.statusCode = 500;
      res.end('report failed');
    }
  });
}
