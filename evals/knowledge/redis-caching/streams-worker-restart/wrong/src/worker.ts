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

type Reply = Array<{ name: string; messages: Array<{ id: string; message: Record<string, string> } | null> }> | null;

export async function runWorker(opts: WorkerOptions): Promise<void> {
  const { redis, stream, group, consumer, handle, signal } = opts;

  try {
    await redis.xGroupCreate(stream, group, '0', { MKSTREAM: true });
  } catch (e) {
    if (!String((e as Error).message).includes('BUSYGROUP')) throw e;
  }

  while (!signal.aborted) {
    const res = (await redis.xReadGroup(group, consumer, { key: stream, id: '>' }, { COUNT: 50, BLOCK: 200 })) as Reply;
    for (const m of res?.[0]?.messages ?? []) {
      if (signal.aborted) return;
      if (!m) continue;
      await handle({ id: m.id, fields: m.message });
      await redis.xAck(stream, group, m.id);
    }
  }
}
