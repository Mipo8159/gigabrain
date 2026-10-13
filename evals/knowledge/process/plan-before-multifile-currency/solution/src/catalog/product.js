export class ValidationError extends Error {}

export const DEFAULT_CURRENCY = 'USD';
export const isCurrency = (c) => typeof c === 'string' && /^[A-Z]{3}$/.test(c);

// Normalises and validates input for a new product.
export function newProduct({ sku, name, priceCents, currency = DEFAULT_CURRENCY }) {
  if (typeof sku !== 'string' || !/^[A-Z0-9-]{3,20}$/.test(sku)) throw new ValidationError('sku must be 3-20 chars A-Z, 0-9, -');
  if (typeof name !== 'string' || !name.trim()) throw new ValidationError('name is required');
  if (!Number.isInteger(priceCents) || priceCents < 0) throw new ValidationError('priceCents must be a non-negative integer');
  if (!isCurrency(currency)) throw new ValidationError('currency must be an ISO 4217 code like "EUR"');
  return { sku, name: name.trim(), priceCents, currency };
}
