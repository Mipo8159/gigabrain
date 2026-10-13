/** Redis key of an order's read-model entry (JSON OrderView). */
export const orderViewKey = (orderId: string) => `order:view:${orderId}`;

/** Read-model entries expire this long after they were last written. */
export const ORDER_VIEW_TTL_SECONDS = 7 * 24 * 3600;
