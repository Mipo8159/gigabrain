import type { RedisClientType } from 'redis';

export async function buildNightlyReport(): Promise<{ rows: number }> {
  // stand-in for the real report query
  await new Promise((r) => setTimeout(r, 10));
  return { rows: 0 };
}

// Called by the scheduler on every instance at 02:00.
export async function nightlyReportJob(redis: RedisClientType): Promise<void> {
  const res = await buildNightlyReport();
  console.log(`nightly report: ${res.rows} rows`);
}
