import { Injectable } from '@nestjs/common';
import { DbService } from '../database/db.service';
import { ListOrdersQuery } from './dto/list-orders.query';

export type OrderSummary = { id: number; placedAt: string; status: string; totalCents: number; lines: number };

@Injectable()
export class OrdersService {
  constructor(private readonly db: DbService) {}

  list(tenantId: string, q: ListOrdersQuery): Promise<OrderSummary[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const r = await c.query(
        `SELECT o.id, o.placed_at, o.status, coalesce(sum(l.amount_cents), 0) AS total, count(l.id) AS lines
           FROM orders o LEFT JOIN order_lines l ON l.order_id = o.id
          WHERE ($1::text IS NULL OR o.status = $1)
          GROUP BY o.id ORDER BY o.placed_at DESC, o.id DESC LIMIT $2`,
        [q.status ?? null, q.limit ?? 20]);
      return r.rows.map((x) => ({
        id: Number(x.id), placedAt: x.placed_at.toISOString(), status: x.status,
        totalCents: Number(x.total), lines: Number(x.lines),
      }));
    });
  }
}
