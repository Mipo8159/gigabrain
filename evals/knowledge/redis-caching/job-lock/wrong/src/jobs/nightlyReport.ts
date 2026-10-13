import type { RedisClientType } from 'redis';
import { withLock } from '../lock.ts';

export async function buildNightlyReport(): Promise<{ rows: number }> {
  // stand-in for the real report query
  await new Promise((r) => setTimeout(r, 10));
  return { rows: 0 };
}

// Called by the scheduler on every instance at 02:00.
export async function nightlyReportJob(redis: RedisClientType): Promise<void> {
  const r = await withLock(redis, 'job:nightly-report', 15 * 60_000, buildNightlyReport);
  if (r.acquired) console.log(`nightly report: ${r.value.rows} rows`);
}
