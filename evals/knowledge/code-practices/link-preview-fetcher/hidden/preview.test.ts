import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPreview } from '../src/preview.ts';

// A fake internet. lookup and fetch share one DNS table; fetch emulates WHATWG redirect modes.
type Route = { status: number; location?: string; html?: string; huge?: boolean };
const PUBLIC_HTML = (t: string) => `<!doctype html><html><head><title>${t}</title></head><body>hi</body></html>`;
const dns: Record<string, string[]> = {
  'example.com': ['93.184.215.14'],
  'sho.rt': ['104.16.1.1'],
  'v6only.test': ['2606:2800:220:1:248:1893:25c8:1946'],
  'wiki.corp.test': ['10.0.0.5'],
  'localhost': ['127.0.0.1', '::1'],
  'metadata.google.internal': ['169.254.169.254'],
  'mixed.test': ['93.184.215.14', '10.0.0.7'],
  'big.test': ['93.184.215.15'],
};
const routes: Record<string, Route> = {
  'example.com/': { status: 200, html: PUBLIC_HTML('Example Domain') },
  'example.com/old': { status: 301, location: '/new' },
  'example.com/new': { status: 200, html: PUBLIC_HTML('New Page') },
  'example.com/to-internal': { status: 302, location: 'http://127.0.0.1/admin' },
  'example.com/to-meta': { status: 302, location: 'http://169.254.169.254/latest/meta-data/' },
  'example.com/to-intranet': { status: 307, location: 'https://wiki.corp.test/' },
  'example.com/loop': { status: 302, location: '/loop' },
  'sho.rt/x': { status: 301, location: 'https://example.com/new' },
  'v6only.test/': { status: 200, html: PUBLIC_HTML('V6') },
  'big.test/': { status: 200, huge: true },
};
const INTERNAL = (ip: string) => /^(127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(ip) || ip === '::1' || /^f[cd]/i.test(ip) || /^::ffff:/i.test(ip) || /^fe80/i.test(ip);

function world() {
  const stats = { internalHits: [] as string[], fetches: 0, bytesPulled: 0 };
  const strip = (h: string) => h.replace(/^\[|\]$/g, '');
  const resolve = (host: string): string[] => {
    const h = strip(host);
    if (/^[\d.]+$/.test(h) || h.includes(':')) return [h];
    const a = dns[h];
    if (!a) throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${h}`), { code: 'ENOTFOUND' });
    return a;
  };
  const lookup = async (hostname: string) => resolve(hostname).map(address => ({ address, family: (address.includes(':') ? 6 : 4) as 4 | 6 }));
  const respond = (u: URL): Response => {
    stats.fetches++;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new TypeError('fetch failed: unsupported scheme');
    const ips = resolve(u.hostname);
    const ip = ips.find(INTERNAL) ?? ips[0];          // worst case: the client connects to the internal one
    if (INTERNAL(ip)) { stats.internalHits.push(u.href); return new Response(PUBLIC_HTML('INTERNAL ADMIN'), { status: 200, headers: { 'content-type': 'text/html' } }); }
    const r = routes[u.hostname.replace(/^\[|\]$/g, '') + u.pathname];
    if (!r) return new Response('nope', { status: 404 });
    if (r.location) return new Response(null, { status: r.status, headers: { location: r.location } });
    if (r.huge) {
      let sent = 0;
      const chunk = new TextEncoder().encode('<p>' + 'x'.repeat(65_536 - 7) + '</p>');
      const body = new ReadableStream<Uint8Array>({
        pull(c) { if (sent >= 20 * 1024 * 1024) return c.close(); sent += chunk.byteLength; stats.bytesPulled += chunk.byteLength; c.enqueue(chunk); },
      });
      return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
    }
    return new Response(r.html, { status: r.status, headers: { 'content-type': 'text/html; charset=utf-8' } });
  };
  const fetch = (async (input: any, init?: RequestInit) => {
    const mode = init?.redirect ?? (input instanceof Request ? input.redirect : 'follow');
    let u = new URL(input instanceof Request ? input.url : String(input));
    for (let i = 0; i < 20; i++) {
      const res = respond(u);
      if (res.status < 300 || res.status >= 400 || !res.headers.get('location')) return res;
      if (mode === 'manual') return res;
      if (mode === 'error') throw new TypeError('fetch failed: unexpected redirect');
      u = new URL(res.headers.get('location')!, u);
    }
    throw new TypeError('fetch failed: redirect count exceeded');
  }) as typeof globalThis.fetch;
  return { deps: { lookup, fetch }, stats };
}

test('returns the title of a public page', async () => {
  const w = world();
  const r = await fetchPreview('https://example.com/', w.deps);
  assert.equal(r.title, 'Example Domain');
});

test('follows redirects between public hosts and reports the final url', async () => {
  const w = world();
  assert.deepEqual(await fetchPreview('https://sho.rt/x', w.deps), { url: 'https://example.com/new', title: 'New Page' });
  assert.equal((await fetchPreview('https://example.com/old', w.deps)).url, 'https://example.com/new');
});

test('IPv6-only public host works', async () => {
  const w = world();
  assert.equal((await fetchPreview('http://v6only.test/', w.deps)).title, 'V6');
});

const blocked = [
  'http://127.0.0.1/', 'http://localhost:8080/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:7f00:1]/',
  'http://2130706433/', 'http://0x7f.0.0.1/', 'http://0.0.0.0/', 'http://169.254.169.254/latest/meta-data/',
  'http://metadata.google.internal/', 'https://wiki.corp.test/', 'http://192.168.1.1/', 'http://172.20.0.1/',
  'http://[fd00::1]/', 'http://[::ffff:10.0.0.1]/', 'http://mixed.test/',
  'https://example.com/to-internal', 'https://example.com/to-meta', 'https://example.com/to-intranet',
];
for (const url of blocked) {
  test(`never reaches an internal address: ${url}`, async () => {
    const w = world();
    let result: unknown;
    await assert.rejects(async () => { result = await fetchPreview(url, w.deps); }, Error, `resolved with ${JSON.stringify(result)}`);
    assert.deepEqual(w.stats.internalHits, [], 'a request was sent to an internal address');
  });
}

test('non-http schemes are refused', async () => {
  for (const url of ['file:///etc/passwd', 'ftp://example.com/', 'gopher://example.com/']) {
    const w = world();
    await assert.rejects(fetchPreview(url, w.deps), Error);
  }
});

test('redirect loops stop', async () => {
  const w = world();
  await assert.rejects(fetchPreview('https://example.com/loop', w.deps), Error);
  assert.ok(w.stats.fetches <= 7, `made ${w.stats.fetches} requests`);
});

test('does not download an unbounded body', async () => {
  const w = world();
  try { await fetchPreview('http://big.test/', w.deps); } catch { /* refusing is fine too */ }
  assert.ok(w.stats.bytesPulled <= 4 * 1024 * 1024, `pulled ${w.stats.bytesPulled} bytes`);
});
