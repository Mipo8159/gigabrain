import { CircuitBreaker } from './breaker.ts';
import { HttpError } from './http.ts';

const PRICING_URL = process.env.PRICING_URL ?? 'http://pricing.internal';
const pricingBreaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 10_000, timeoutMs: 2_000 });

export type Price = { sku: string; amountCents: number; currency: string };

export async function getPrice(sku: string, signal?: AbortSignal): Promise<Price> {
  const res = await fetch(`${PRICING_URL}/prices/${encodeURIComponent(sku)}`, { signal });
  if (!res.ok) throw new HttpError(res.status, `pricing responded ${res.status}`);
  return (await res.json()) as Price;
}

export async function getQuote(sku: string, qty: number) {
  const price = await pricingBreaker.call((signal) => getPrice(sku, signal));
  return { sku, qty, totalCents: price.amountCents * qty, currency: price.currency };
}
