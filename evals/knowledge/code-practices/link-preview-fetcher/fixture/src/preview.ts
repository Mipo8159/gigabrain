export type PreviewDeps = {
  lookup(hostname: string): Promise<{ address: string; family: 4 | 6 }[]>; // dns.promises.lookup(h, { all: true })
  fetch: typeof globalThis.fetch;
};

export async function fetchPreview(url: string, deps: PreviewDeps): Promise<{ url: string; title: string | null }> {
  throw new Error('not implemented');
}
