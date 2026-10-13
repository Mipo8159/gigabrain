export type Product = { id: string; title: string; priceCents: number; stock: number };

export interface ProductRepo {
  find(id: string): Promise<Product | null>;
  findMany(ids: string[]): Promise<Product[]>;
  update(id: string, patch: Partial<Omit<Product, 'id'>>): Promise<Product>;
}

export class InMemoryProductRepo implements ProductRepo {
  rows = new Map<string, Product>();
  constructor(seed: Product[] = []) { for (const p of seed) this.rows.set(p.id, { ...p }); }
  async find(id: string) { const p = this.rows.get(id); return p ? { ...p } : null; }
  async findMany(ids: string[]) { return ids.flatMap((id) => { const p = this.rows.get(id); return p ? [{ ...p }] : []; }); }
  async update(id: string, patch: Partial<Omit<Product, 'id'>>) {
    const cur = this.rows.get(id);
    if (!cur) throw new Error(`product ${id} not found`);
    const next = { ...cur, ...patch, id };
    this.rows.set(id, next);
    return { ...next };
  }
}
