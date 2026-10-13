import type pg from 'pg';

export type CustomerStats = {
  orders: number;
  itemsBought: number;
  spent: string;
  isRepeatCustomer: boolean;
};

export async function customerStats(pool: pg.Pool, customerId: number): Promise<CustomerStats> {
  const { rows } = await pool.query(
    `WITH live_orders AS (
       SELECT id FROM orders WHERE customer_id = $1 AND status <> 'cancelled'
     )
     SELECT
       (SELECT count(*) FROM live_orders) AS orders,
       coalesce(sum(i.quantity), 0) AS items_bought,
       to_char(coalesce(sum(i.quantity * i.unit_price), 0), 'FM999999999990.00') AS spent
     FROM order_items i
     WHERE i.order_id IN (SELECT id FROM live_orders)`,
    [customerId],
  );

  const row = rows[0];
  return {
    orders: row.orders,
    itemsBought: row.items_bought,
    spent: row.spent,
    isRepeatCustomer: row.orders > 1,
  };
}
