import { BadRequestException, Injectable } from '@nestjs/common';
import { DbService } from '../database/db.service';
import { PricingClient } from '../pricing/pricing.client';
import { PricingHttpError } from '../pricing/pricing-http.error';
import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';
import { ReportCache } from './report-cache';
import { SalesReportQuery } from './dto/sales-report.query';

export type ReportRow = { key: string; orders: number; units: number; revenueCents: number; listValueCents?: number | null };
export type SalesReport = {
  from: string; to: string; groupBy: 'day' | 'sku';
  rows: ReportRow[];
  totals: { orders: number; units: number; revenueCents: number };
  pricing?: 'ok' | 'unavailable';
};

const DAY = 86_400_000;
const isDate = (s: string) => { const d = new Date(`${s}T00:00:00Z`); return !isNaN(+d) && d.toISOString().slice(0, 10) === s; };

@Injectable()
export class ReportsService {
  // 4xx (e.g. 404 for a discontinued SKU) is an answer, not a pricing failure.
  private readonly breaker = new CircuitBreaker(5, 30_000,
    (e) => !(e instanceof PricingHttpError && e.status >= 400 && e.status < 500));

  constructor(
    private readonly db: DbService,
    private readonly pricing: PricingClient,
    private readonly cache: ReportCache,
  ) {}

  async sales(tenantId: string, q: SalesReportQuery): Promise<SalesReport> {
    if (!isDate(q.from) || !isDate(q.to)) throw new BadRequestException('from/to must be valid dates');
    const days = (Date.parse(q.to) - Date.parse(q.from)) / DAY;
    if (days < 0) throw new BadRequestException('from is after to');
    if (days > 365) throw new BadRequestException('range is longer than 366 days');
    const groupBy = q.groupBy ?? 'day';
    const refunds = q.includeRefunds === true;
    const key = `report:sales:v1:${tenantId}:${q.from}:${q.to}:${groupBy}:${refunds ? 1 : 0}`;
    return this.cache.getOrCompute(key, 60, () => this.compute(tenantId, q.from, q.to, groupBy, refunds));
  }

  private async compute(tenantId: string, from: string, to: string, groupBy: 'day' | 'sku', refunds: boolean): Promise<SalesReport> {
    const keyExpr = groupBy === 'day' ? `to_char(o.placed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')` : 'l.sku';
    const where = `o.placed_at >= ($1::date)::timestamp AT TIME ZONE 'UTC'
       AND o.placed_at < ($2::date + 1)::timestamp AT TIME ZONE 'UTC'
       AND (o.status = 'paid' OR ($3::boolean AND o.status = 'refunded'))`;
    const { rows, totals } = await this.db.withTenant(tenantId, async (c) => {
      const r = await c.query(
        `SELECT ${keyExpr} AS key, count(DISTINCT o.id)::int AS orders, sum(l.qty)::bigint AS units,
                sum(l.amount_cents)::bigint AS revenue
           FROM orders o JOIN order_lines l ON l.order_id = o.id
          WHERE ${where} GROUP BY 1 ORDER BY 1`, [from, to, refunds]);
      const t = await c.query(
        `SELECT count(DISTINCT o.id)::int AS orders, coalesce(sum(l.qty), 0)::bigint AS units,
                coalesce(sum(l.amount_cents), 0)::bigint AS revenue
           FROM orders o JOIN order_lines l ON l.order_id = o.id WHERE ${where}`, [from, to, refunds]);
      return {
        rows: r.rows.map((x): ReportRow => ({ key: x.key, orders: x.orders, units: Number(x.units), revenueCents: Number(x.revenue) })),
        totals: { orders: t.rows[0].orders, units: Number(t.rows[0].units), revenueCents: Number(t.rows[0].revenue) },
      };
    });
    const report: SalesReport = { from, to, groupBy, rows, totals };
    if (groupBy === 'sku') report.pricing = await this.addListValues(rows);
    return report;
  }

  private async addListValues(rows: ReportRow[]): Promise<'ok' | 'unavailable'> {
    let usable = true;
    const queue = [...rows];
    const worker = async () => {
      for (let row = queue.shift(); row; row = queue.shift()) {
        if (!usable) { row.listValueCents = null; continue; }
        const r = row;
        try {
          const price = await this.breaker.exec(() => this.pricing.getListPrice(r.key, AbortSignal.timeout(2000)));
          r.listValueCents = price * r.units;
        } catch (e) {
          r.listValueCents = null;
          if (!(e instanceof PricingHttpError && e.status === 404)) usable = false;
          if (e instanceof CircuitOpenError) usable = false;
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (!usable) for (const r of rows) r.listValueCents = null;
    return usable ? 'ok' : 'unavailable';
  }
}
