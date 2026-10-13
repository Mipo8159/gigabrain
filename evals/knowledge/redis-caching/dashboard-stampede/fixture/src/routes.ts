import type { RedisClientType } from 'redis';
import { getOrCompute } from './cache.ts';

export type Summary = { orders: number; revenueCents: number; generatedAt: string };

// Stand-in for the warehouse query.
async function querySummary(orgId: string): Promise<Summary> {
  await new Promise((r) => setTimeout(r, 50));
  return { orders: 0, revenueCents: 0, generatedAt: new Date().toISOString() };
}

export async function getDashboardSummary(redis: RedisClientType, orgId: string): Promise<Summary> {
  return getOrCompute(redis, `dash:summary:${orgId}`, 300, () => querySummary(orgId));
}
