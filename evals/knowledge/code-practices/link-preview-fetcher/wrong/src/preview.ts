import net from 'node:net';

export type PreviewDeps = {
  lookup(hostname: string): Promise<{ address: string; family: 4 | 6 }[]>; // dns.promises.lookup(h, { all: true })
  fetch: typeof globalThis.fetch;
};

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 1024 * 1024;

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^198\.1[89]\./,
  /^2(2[4-9]|[3-5]\d)\./,
];
const PRIVATE_V6 = [/^::$/, /^::1$/, /^f[cd][0-9a-f]{2}:/, /^fe[89ab][0-9a-f]:/, /^ff[0-9a-f]{2}:/];

function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase();
  if (net.isIPv4(ip)) return PRIVATE_V4.some(re => re.test(ip));
  if (net.isIPv6(ip)) return PRIVATE_V6.some(re => re.test(ip));
  return true;
}

async function assertPublic(url: URL, deps: PreviewDeps): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`unsupported scheme: ${url.protocol}`);
  if (url.username || url.password) throw new Error('credentials in url');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [host] : (await deps.lookup(host)).map(a => a.address);
  if (addresses.length === 0) throw new Error(`could not resolve ${host}`);
  if (addresses.some(isPrivateAddress)) throw new Error(`refusing to fetch private address for ${host}`);
}

async function readBody(res: Response, limit: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, limit));
}

export async function fetchPreview(url: string, deps: PreviewDeps): Promise<{ url: string; title: string | null }> {
  let current = new URL(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(current, deps);
    const res = await deps.fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'text/html' },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel().catch(() => {});
      if (!location) throw new Error('redirect without location');
      current = new URL(location, current);
      continue;
    }
    if (!res.ok) throw new Error(`unexpected status ${res.status}`);

    const html = await readBody(res, MAX_BODY_BYTES);
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    return { url: current.href, title: m ? m[1].replace(/\s+/g, ' ').trim() : null };
  }
  throw new Error('too many redirects');
}
