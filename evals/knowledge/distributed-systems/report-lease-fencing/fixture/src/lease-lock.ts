// Client for the coordination service's lease locks. Platform-owned: do not change.

export type Lease = {
  name: string;
  holder: string;
  /** Cluster-wide revision of this acquisition. Strictly increasing across all acquisitions of all locks. */
  revision: number;
  /** Lease expiry, in the coordination service's clock (ms). */
  expiresAt: number;
};

export class LeaseLock {
  #now: () => number;
  #revision = 0;
  #leases = new Map<string, Lease>();

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  /** Try to take the lock. Returns the lease, or null if someone else holds an unexpired lease. */
  async acquire(name: string, holder: string, ttlMs: number): Promise<Lease | null> {
    const cur = this.#leases.get(name);
    if (cur && cur.expiresAt > this.#now()) return null;
    const lease = { name, holder, revision: ++this.#revision, expiresAt: this.#now() + ttlMs };
    this.#leases.set(name, lease);
    return { ...lease };
  }

  /** Release the lease. A no-op if the lease has expired and someone else holds the lock now. */
  async release(lease: Lease): Promise<void> {
    const cur = this.#leases.get(lease.name);
    if (cur && cur.revision === lease.revision) this.#leases.delete(lease.name);
  }
}
