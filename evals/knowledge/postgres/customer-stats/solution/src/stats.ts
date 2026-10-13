import type pg from 'pg';

export type CustomerStats = {
  orders: number;
  itemsBought: number;
  spent: string;
  isRepeatCustomer: boolean;
};

export async function customerStats(pool: pg.Pool, customerId: number): Promise<CustomerStats> {
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*) FROM orders o WHERE o.customer_id = $1 AND o.status <> 'cancelled') AS orders,
       coalesce(sum(i.quantity), 0) AS items,
       coalesce(sum(i.quantity * i.unit_price), 0)::numeric(14,2)::text AS spent
     FROM orders o JOIN order_items i ON i.order_id = o.id
     WHERE o.customer_id = $1 AND o.status <> 'cancelled'`,
    [customerId],
  );
  const orders = Number(rows[0].orders);
  return { orders, itemsBought: Number(rows[0].items), spent: rows[0].spent, isRepeatCustomer: orders > 1 };
}
