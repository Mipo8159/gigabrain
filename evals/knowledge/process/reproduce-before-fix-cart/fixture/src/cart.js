import { findCoupon } from './coupons.js';

const toCents = (n) => Math.round(n * 100);

// items: [{ sku, price, qty }] with price in currency units; returns the total in currency units.
export function cartTotal(items, couponCode) {
  const coupon = findCoupon(couponCode);
  let cents = 0;
  for (const item of items) {
    const line = toCents(item.price) * item.qty;
    if (coupon?.type === 'percent') {
      cents += Math.round(toCents(item.price) * (100 - coupon.value) / 100);
    } else {
      cents += line;
    }
  }
  if (coupon?.type === 'fixed') cents = Math.max(0, cents - coupon.value);
  return cents / 100;
}
