import net from 'node:net';

export type PreviewDeps = {
  lookup(hostname: string): Promise<{ address: string; family: 4 | 6 }[]>; // dns.promises.lookup(h, { all: true })
  fetch: typeof globalThis.fetch;
};

const blocked = new net.BlockList();
for (const [a, p] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3]] as const) blocked.addSubnet(a, p, 'ipv4');
for (const [a, p] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['2001:db8::', 32]] as const) blocked.addSubnet(a, p, 'ipv6');

function isPublic(address: string): boolean {
  let a = address.replace(/^\[|\]$/g, '').toLowerCase();
  const fam = net.isIP(a);
  if (!fam) return false;
  if (fam === 6) {
    const mapped = /^(?:0*:)*:?ffff:(?:0+:)?(.+)$/.exec(a);
    if (mapped) {
      const tail = mapped[1];
      if (net.isIPv4(tail)) a = tail;
      else { const m = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(tail); if (!m) return false;
        const n = (parseInt(m[1], 16) << 16 | parseInt(m[2], 16)) >>> 0; a = [n >>> 24, n >> 16 & 255, n >> 8 & 255, n & 255].join('.'); }
      return !blocked.check(a, 'ipv4');
    }
    return !blocked.check(a, 'ipv6');
  }
  return !blocked.check(a, 'ipv4');
}

async function assertSafe(u: URL, deps: PreviewDeps) {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported scheme');
  if (u.username || u.password) throw new Error('credentials in url');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await deps.lookup(host);
  if (!addrs.length || !addrs.every(x => isPublic(x.address))) throw new Error('address not allowed');
}

async function readCapped(res: Response, cap: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let n = 0;
  while (n < cap) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); n += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, cap));
}

export async function fetchPreview(url: string, deps: PreviewDeps): Promise<{ url: string; title: string | null }> {
  let current = new URL(url);
  for (let hop = 0; hop <= 5; hop++) {
    await assertSafe(current, deps);
    const res = await deps.fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { accept: 'text/html' } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await res.body?.cancel().catch(() => {});
      if (!loc) throw new Error('redirect without location');
      current = new URL(loc, current);
      continue;
    }
    if (!res.ok) throw new Error(`status ${res.status}`);
    const html = await readCapped(res, 1 << 20);
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    return { url: current.href, title: m ? m[1].replace(/\s+/g, ' ').trim() : null };
  }
  throw new Error('too many redirects');
}
