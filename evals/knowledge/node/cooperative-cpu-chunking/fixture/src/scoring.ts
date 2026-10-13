import { scoreRecord, type Rec } from './model.ts';

export type { Rec };

export async function scoreAll(records: Rec[]): Promise<number[]> {
  const out: number[] = [];
  for (const r of records) out.push(scoreRecord(r));
  return out;
}
