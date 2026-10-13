import type pg from 'pg';

export type DayRevenue = { day: string; totalCents: number };

export async function dailyRevenue(pool: pg.Pool, merchantId: number, from: string, to: string): Promise<DayRevenue[]> {
  const { rows } = await pool.query(
    `WITH m AS (SELECT timezone AS tz FROM merchants WHERE id = $1),
          days AS (SELECT d::date AS day FROM generate_series($2::date, $3::date, interval '1 day') d)
     SELECT to_char(days.day, 'YYYY-MM-DD') AS day, coalesce(sum(o.amount_cents), 0)::text AS total
       FROM days CROSS JOIN m
       LEFT JOIN orders o
         ON o.merchant_id = $1 AND o.status = 'paid'
        AND o.created_at >= (days.day::timestamp AT TIME ZONE m.tz)
        AND o.created_at <  ((days.day + 1)::timestamp AT TIME ZONE m.tz)
      GROUP BY days.day
      ORDER BY days.day`,
    [merchantId, from, to],
  );
  return rows.map((r) => ({ day: r.day, totalCents: Number(r.total) }));
}
