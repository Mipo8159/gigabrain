import { Pool } from 'pg';

/** The app connects as app_rw (RLS applies); DATABASE_URL in the env is the superuser one. */
export function appDatabaseUrl(superUrl = process.env.DATABASE_URL!): string {
  const u = new URL(superUrl);
  u.username = 'app_rw';
  u.password = 'app_rw';
  return u.toString();
}

/** Superuser pool for seeding (bypasses RLS). */
export function adminPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
}

export async function seedOrder(pool: Pool, tenantId: string, placedAt: string, status: string, lines: [string, number, number][]) {
  const o = await pool.query('INSERT INTO orders (tenant_id, placed_at, status) VALUES ($1, $2, $3) RETURNING id', [tenantId, placedAt, status]);
  for (const [sku, qty, amount] of lines) {
    await pool.query('INSERT INTO order_lines (tenant_id, order_id, sku, qty, amount_cents) VALUES ($1, $2, $3, $4, $5)',
      [tenantId, o.rows[0].id, sku, qty, amount]);
  }
  return Number(o.rows[0].id);
}
