import type { Readable } from 'node:stream';

export async function* readNdjson(input: Readable): AsyncGenerator<unknown> {
  throw new Error('not implemented');
}
