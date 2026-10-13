// In-memory product store (Postgres adapter lives in the infra repo and mirrors this API).
export function createProductRepo(seed = []) {
  const rows = new Map(seed.map((p) => [p.sku, { ...p }]));
  return {
    insert(p) {
      if (rows.has(p.sku)) return false;
      rows.set(p.sku, { ...p, createdAt: new Date().toISOString() });
      return true;
    },
    get(sku) {
      const p = rows.get(sku);
      return p ? { ...p } : null;
    },
    list() {
      return [...rows.values()].map((p) => ({ ...p })).sort((a, b) => a.sku.localeCompare(b.sku));
    },
  };
}
