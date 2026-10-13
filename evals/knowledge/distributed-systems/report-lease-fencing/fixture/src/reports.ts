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
    const body = await this.#opts.render(reportId);
    await this.#opts.db.put(reportKey(reportId), { body, renderedAt: Date.now() });
    return true;
  }
}

export async function getReport(db: KvStore, reportId: string): Promise<string | undefined> {
  const item = await db.get(reportKey(reportId));
  return item?.body as string | undefined;
}
