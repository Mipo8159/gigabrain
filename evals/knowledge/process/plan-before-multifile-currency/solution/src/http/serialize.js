export function productJson(p) {
  return { sku: p.sku, name: p.name, price: { amountCents: p.priceCents, currency: p.currency } };
}
