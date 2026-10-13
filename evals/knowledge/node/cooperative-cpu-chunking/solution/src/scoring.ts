import { setImmediate as yieldToLoop } from 'node:timers/promises';
import { scoreRecord, type Rec } from './model.ts';

export type { Rec };

const SLICE_MS = 10;

export async function scoreAll(records: Rec[]): Promise<number[]> {
  const out: number[] = new Array(records.length);
  let sliceStart = performance.now();
  for (let i = 0; i < records.length; i++) {
    out[i] = scoreRecord(records[i]);
    if ((i & 63) === 63 && performance.now() - sliceStart > SLICE_MS) {
      await yieldToLoop();
      sliceStart = performance.now();
    }
  }
  return out;
}
