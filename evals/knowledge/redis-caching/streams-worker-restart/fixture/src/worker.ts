import type { RedisClientType } from 'redis';

export type Job = { id: string; fields: Record<string, string> };
export type WorkerOptions = {
  redis: RedisClientType;
  stream: string;
  group: string;
  consumer: string;
  handle: (job: Job) => Promise<void>;
  signal: AbortSignal;
};

export async function runWorker(opts: WorkerOptions): Promise<void> {
  throw new Error('not implemented');
}
