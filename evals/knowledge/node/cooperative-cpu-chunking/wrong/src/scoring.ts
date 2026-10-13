import { scoreRecord, type Rec } from './model.ts';

export type { Rec };

const CHUNK_SIZE = 500;

export async function scoreAll(records: Rec[]): Promise<number[]> {
  const out: number[] = new Array(records.length);
  for (let start = 0; start < records.length; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, records.length);
    for (let i = start; i < end; i++) out[i] = scoreRecord(records[i]);
    await Promise.resolve();
  }
  return out;
}
