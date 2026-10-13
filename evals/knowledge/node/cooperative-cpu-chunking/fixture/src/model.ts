export type Rec = { id: number; amount: number; country: string };

/** Vendor risk model wrapper. CPU-bound, deterministic, roughly 20-50 µs per call. Treat as a black box. */
export function scoreRecord(r: Rec): number {
  let h = (r.id * 2654435761) >>> 0;
  for (let i = 0; i < 400; i++) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    h ^= r.country.charCodeAt(i % r.country.length);
  }
  return ((h % 1000) / 1000) * Math.log1p(r.amount);
}
