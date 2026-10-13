import { promises as dns } from 'node:dns';
import { fetchPreview, type PreviewDeps } from './preview.ts';

export const realDeps: PreviewDeps = {
  lookup: h => dns.lookup(h, { all: true }) as Promise<{ address: string; family: 4 | 6 }[]>,
  fetch: globalThis.fetch,
};

export const previewFor = (url: string) => fetchPreview(url, realDeps);
