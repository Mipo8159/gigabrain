import type pg from 'pg';

export type DayRevenue = { day: string; totalCents: number };

export async function dailyRevenue(pool: pg.Pool, merchantId: number, from: string, to: string): Promise<DayRevenue[]> {
  const { rows } = await pool.query(
    `WITH m AS (SELECT id, timezone FROM merchants WHERE id = $1),
          days AS (SELECT d::date AS day FROM generate_series($2::date, $3::date, interval '1 day') d),
          sales AS (
            SELECT (o.created_at AT TIME ZONE m.timezone)::date AS day, sum(o.amount_cents) AS total
              FROM orders o JOIN m ON m.id = o.merchant_id
             WHERE o.status = 'paid'
             GROUP BY 1
          )
     SELECT days.day, coalesce(sales.total, 0) AS total
       FROM days LEFT JOIN sales ON sales.day = days.day
      ORDER BY days.day`,
    [merchantId, from, to],
  );
  return rows.map((r) => ({ day: (r.day as Date).toISOString().slice(0, 10), totalCents: Number(r.total) }));
}
