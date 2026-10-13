import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';

process.env.LOG_SILENT = '1';

export async function startApp() {
  const server = createApp();
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', 'x-user-id': 'u1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  };
  return { call, close: () => new Promise((r) => server.close(r)) };
}
