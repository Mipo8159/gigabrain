/** One event on `orders.lifecycle`, keyed by orderId. `seq` increases per order. */
export type OrderEvent = {
  orderId: string;
  seq: number;
  type: 'OrderCreated' | 'OrderPaid' | 'OrderShipped' | 'OrderCancelled';
  payload: Record<string, unknown>;
};

/** Producer for `orders.lifecycle.retry`; a delayed consumer feeds it back through `handleRetry`. */
export interface RetryTopic {
  send(event: OrderEvent): Promise<void>;
}
