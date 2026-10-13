import { EventEmitter } from 'node:events';
import type pg from 'pg';

// Session-level advisory locks belong to one backend connection. So leadership is tied to one client checked out
// of the pool and held for the whole term: lock and unlock run on it, the pool's idle reaper can't close it, and
// losing that connection means losing the lock.
export class LeaderElector extends EventEmitter {
  #pool: pg.Pool;
  #key: number;
  #client: pg.PoolClient | null = null;
  #onError: ((err: Error) => void) | null = null;
  #onEnd: (() => void) | null = null;

  constructor(pool: pg.Pool, lockKey: number) {
    super();
    this.#pool = pool;
    this.#key = lockKey;
  }

  async campaign(): Promise<boolean> {
    if (this.#client) return true;
    const client = await this.#pool.connect();
    let got = false;
    try {
      const { rows } = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1) AS ok', [this.#key]);
      got = rows[0].ok;
    } catch (err) {
      client.release(err as Error);
      throw err;
    }
    if (!got) {
      client.release();
      return false;
    }
    this.#client = client;
    this.#onError = (err) => this.#lost(client, err);
    this.#onEnd = () => this.#lost(client, new Error('leader connection ended'));
    client.on('error', this.#onError);
    client.on('end', this.#onEnd);
    return true;
  }

  isLeader(): boolean {
    return this.#client !== null;
  }

  async resign(): Promise<void> {
    const client = this.#detach();
    if (!client) return;
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [this.#key]);
      client.release();
    } catch (err) {
      client.release(err as Error); // destroy it: closing the session drops the lock anyway
    }
  }

  #detach(): pg.PoolClient | null {
    const client = this.#client;
    if (!client) return null;
    if (this.#onError) client.off('error', this.#onError);
    if (this.#onEnd) client.off('end', this.#onEnd);
    this.#client = null;
    this.#onError = this.#onEnd = null;
    return client;
  }

  #lost(client: pg.PoolClient, err: Error) {
    if (this.#client !== client) return;
    this.#detach();
    client.on('error', () => {}); // late errors from the dead socket
    client.release(err);
    this.emit('leadershipLost', err);
  }
}
