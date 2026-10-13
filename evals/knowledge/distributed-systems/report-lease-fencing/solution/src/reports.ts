import { randomUUID } from 'node:crypto';
import type { KvStore } from './kv.ts';
import type { LeaseLock } from './lease-lock.ts';

export type ReportWorkerOptions = {
  lock: LeaseLock;
  db: KvStore;
  /** Builds the report from the current data. Slow for big customers. */
  render: (reportId: string) => Promise<string>;
  ttlMs?: number;
};

const reportKey = (reportId: string) => `report:${reportId}`;

export class ReportWorker {
  readonly id = randomUUID();
  #opts: ReportWorkerOptions;

  constructor(opts: ReportWorkerOptions) {
    this.#opts = opts;
  }

  async regenerate(reportId: string): Promise<boolean> {
    const { lock, db, render, ttlMs = 30_000 } = this.#opts;
    const lease = await lock.acquire(`report:${reportId}`, this.id, ttlMs);
    if (!lease) return false;
    try {
      const body = await render(reportId);
      // The lease can expire while we render or while this write is in flight, so checking it here proves nothing.
      // The store enforces it instead: the lease revision is a fencing token, and a write carrying an older token
      // than the one already stored is refused.
      return await db.put(
        reportKey(reportId),
        { body, renderedAt: Date.now(), fence: lease.revision },
        { condition: { or: [{ attributeNotExists: 'fence' }, { attribute: 'fence', op: '<', value: lease.revision }] } },
      );
    } finally {
      await lock.release(lease);
    }
  }
}

export async function getReport(db: KvStore, reportId: string): Promise<string | undefined> {
  const item = await db.get(reportKey(reportId));
  return item?.body as string | undefined;
}
