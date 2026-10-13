import { Readable } from 'node:stream';
import type { ObjectStorage } from './types.ts';

/** Object store over HTTP (S3-compatible GET/HEAD with a bearer token from the platform team's proxy). */
export class HttpObjectStorage implements ObjectStorage {
  private base: string;
  private token: string;

  constructor(base: string, token: string) {
    this.base = base.replace(/\/$/, '');
    this.token = token;
  }

  private url(key: string) {
    return `${this.base}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async open(key: string): Promise<Readable> {
    const res = await fetch(this.url(key), { headers: { authorization: `Bearer ${this.token}` } });
    if (!res.ok || !res.body) throw new Error(`storage GET ${key}: ${res.status}`);
    return Readable.fromWeb(res.body as any);
  }

  async size(key: string): Promise<number | null> {
    const res = await fetch(this.url(key), { method: 'HEAD', headers: { authorization: `Bearer ${this.token}` } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`storage HEAD ${key}: ${res.status}`);
    return Number(res.headers.get('content-length'));
  }
}
