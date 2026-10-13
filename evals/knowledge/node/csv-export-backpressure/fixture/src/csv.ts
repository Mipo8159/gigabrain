import type { Writable } from 'node:stream';

export async function writeCsv(rows: AsyncIterable<Record<string, unknown>>, out: Writable): Promise<void> {
  throw new Error('not implemented');
}
