import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import type { ObjectStorage } from './types.ts';

/** Directory-backed storage for local dev and tests. */
export class LocalObjectStorage implements ObjectStorage {
  private root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(key: string) {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('key escapes storage root');
    return p;
  }

  async open(key: string): Promise<Readable> {
    return createReadStream(this.path(key));
  }

  async size(key: string): Promise<number | null> {
    try {
      return (await stat(this.path(key))).size;
    } catch {
      return null;
    }
  }
}
