const COUPONS = {
  TENOFF: { type: 'percent', value: 10 },
  FIVER: { type: 'fixed', value: 500 }, // cents, whole cart
};

export function findCoupon(code) {
  return code ? COUPONS[code.toUpperCase()] ?? null : null;
}
