import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFilesHandler } from '../src/files.ts';

let base: string, server: http.Server, port: number;
const SECRET = 'TOP-SECRET-PAYROLL';

before(async () => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dl-')));
  fs.mkdirSync(path.join(base, 'data/uploads'), { recursive: true });
  fs.mkdirSync(path.join(base, 'data/uploads-private'), { recursive: true });
  fs.writeFileSync(path.join(base, 'data/uploads/report.pdf'), '%PDF-1.4 hello');
  fs.writeFileSync(path.join(base, 'data/uploads/my notes #1 é.txt'), 'notes body');
  fs.writeFileSync(path.join(base, 'data/uploads-private/secret.txt'), SECRET);
  fs.writeFileSync(path.join(base, 'data/secret.txt'), SECRET);
  fs.writeFileSync(path.join(base, 'secret.txt'), SECRET);
  server = http.createServer(createFilesHandler(path.join(base, 'data/uploads')));
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  port = (server.address() as any).port;
});
after(() => { server.close(); fs.rmSync(base, { recursive: true, force: true }); });

// raw request: no client-side normalisation of the path
function get(rawPath: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method: 'GET' }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => (body += c));
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.setTimeout(1500, () => req.destroy(new Error('no response within 1.5 s (handler crashed or hung)')));
    req.on('error', reject);
    req.end();
  });
}

test('downloads an uploaded file', async () => {
  const r = await get('/files/report.pdf');
  assert.equal(r.status, 200);
  assert.equal(r.body, '%PDF-1.4 hello');
});

test('names with spaces, # and unicode work when encoded', async () => {
  const r = await get('/files/' + encodeURIComponent('my notes #1 é.txt'));
  assert.equal(r.status, 200);
  assert.equal(r.body, 'notes body');
});

test('missing file is 404', async () => {
  assert.equal((await get('/files/nope.pdf')).status, 404);
});

const attacks: (string | (() => string))[] = [
  '/files/..%2Fuploads-private%2Fsecret.txt',
  '/files/%2E%2E%2Fuploads-private%2Fsecret.txt',
  '/files/..%2Fsecret.txt',
  '/files/..%2F..%2Fsecret.txt',
  '/files/..%5Csecret.txt',
  () => '/files/' + encodeURIComponent(path.join(base, 'secret.txt')),
  () => '/files/' + encodeURIComponent(path.join(base, 'data/uploads-private/secret.txt')),
  '/files/%252e%252e%252fsecret.txt',
  '/files/..%252Fsecret.txt',
  '/files/report.pdf%00..%2Fsecret.txt',
];
for (const a of attacks) {
  test(`does not leave the uploads dir: ${typeof a === 'string' ? a : 'absolute path'}`, async () => {
    const p = typeof a === 'string' ? a : a();
    const r = await get(p);
    assert.ok(!r.body.includes(SECRET), `leaked a file outside uploads via ${p}`);
    assert.ok(r.status >= 400 && r.status < 500, `status ${r.status}`);
  });
}
