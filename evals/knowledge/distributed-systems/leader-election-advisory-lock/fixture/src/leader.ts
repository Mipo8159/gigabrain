import { EventEmitter } from 'node:events';
import type pg from 'pg';

export class LeaderElector extends EventEmitter {
  constructor(pool: pg.Pool, lockKey: number) {
    super();
  }

  /** Try to become leader without blocking. Resolves true if this instance is (now) the leader. */
  async campaign(): Promise<boolean> {
    throw new Error('not implemented');
  }

  isLeader(): boolean {
    return false;
  }

  /** Give up leadership so another instance can take over. */
  async resign(): Promise<void> {}
}
