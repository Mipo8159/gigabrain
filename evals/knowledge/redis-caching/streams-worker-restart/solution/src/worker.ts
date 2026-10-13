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

  // After a restart, our own un-ACKed entries are only visible via an explicit ID ('0'), never via '>'.
  let cursor = '0';
  while (!signal.aborted) {
    const reading = cursor === '>' ? '>' : cursor;
    const res = (await redis.xReadGroup(group, consumer, { key: stream, id: reading },
      { COUNT: 50, ...(reading === '>' ? { BLOCK: 200 } : {}) })) as Reply;
    const messages = res?.[0]?.messages ?? [];
    if (reading !== '>' && messages.length === 0) { cursor = '>'; continue; } // history drained
    for (const m of messages) {
      if (signal.aborted) return;
      if (!m) continue; // deleted entry still in the PEL
      await handle({ id: m.id, fields: m.message });
      await redis.xAck(stream, group, m.id);
      if (reading !== '>') cursor = m.id;
    }
  }
}
