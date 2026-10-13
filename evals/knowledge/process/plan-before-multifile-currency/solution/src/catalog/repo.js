import { DEFAULT_CURRENCY } from './product.js';

// In-memory product store (Postgres adapter lives in the infra repo and mirrors this API).
export function createProductRepo(seed = []) {
  const withCurrency = (p) => ({ currency: DEFAULT_CURRENCY, ...p });
  const rows = new Map(seed.map((p) => [p.sku, withCurrency(p)]));
  return {
    insert(p) {
      if (rows.has(p.sku)) return false;
      rows.set(p.sku, { ...withCurrency(p), createdAt: new Date().toISOString() });
      return true;
    },
    get(sku) {
      const p = rows.get(sku);
      return p ? { ...p } : null;
    },
    list({ currency } = {}) {
      return [...rows.values()]
        .filter((p) => !currency || p.currency === currency)
        .map((p) => ({ ...p }))
        .sort((a, b) => a.sku.localeCompare(b.sku));
    },
  };
}
