import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const MAIN = fileURLToPath(new URL('../src/main.ts', import.meta.url));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function start(): Promise<{ child: ChildProcess; port: number }> {
  const child = spawn(process.execPath, [MAIN], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((resolve, reject) => {
    let buf = '';
    child.stdout!.on('data', (d) => {
      buf += d;
      const m = buf.match(/listening (\d+)/);
      if (m) resolve({ child, port: Number(m[1]) });
    });
    child.on('exit', (c) => reject(new Error(`server exited early (${c})`)));
  });
}

function get(port: number, path: string, agent: http.Agent | false): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path, agent }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.on('error', reject);
  });
}

function exitWithin(child: ChildProcess, ms: number): Promise<{ code: number | null; signal: string | null } | 'timeout'> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve('timeout'), ms);
    child.once('exit', (code, signal) => { clearTimeout(t); resolve({ code, signal }); });
  });
}

test('SIGTERM: in-flight request completes, new connections refused, prompt exit 0', async () => {
  const { child, port } = await start();
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  try {
    const warm = await get(port, '/health', agent);
    assert.equal(warm.status, 200);

    const inflight = get(port, '/slow', agent); // reuses the kept-alive socket
    const inflightResult = inflight.then((r) => r, (e) => e as Error);
    await sleep(100);
    child.kill('SIGTERM');
    await sleep(100);

    await assert.rejects(get(port, '/health', false), (e: any) => e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET',
      'new connections must be refused after SIGTERM');

    const r = await inflightResult;
    assert.ok(!(r instanceof Error), `in-flight request failed: ${r instanceof Error ? r.message : ''}`);
    assert.equal((r as any).status, 200);
    assert.equal((r as any).body, 'done');

    // in-flight work ends ~400 ms after SIGTERM; allow generous slack, but not a keep-alive timeout's worth
    const exit = await exitWithin(child, 2000);
    assert.notEqual(exit, 'timeout', 'process did not exit within 2 s of the last response finishing');
    assert.deepEqual(exit, { code: 0, signal: null });
  } finally {
    agent.destroy();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});
