import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { PG_POOL } from './tokens';

@Injectable()
export class DbService implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Runs fn in a transaction with `app.tenant_id` set for that transaction only (RLS).
   * Every tenant query goes through here.
   */
  async withTenant<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }

  /** Non-tenant tables only (tenants). */
  query<T extends object = any>(sql: string, params?: unknown[]) {
    return this.pool.query<T>(sql, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
