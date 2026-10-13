/** Tiny in-memory table. Replaced by Postgres repositories later; keep the call sites simple. */
export class Table<T extends { id: string }> {
  private rows = new Map<string, T>();

  insert(row: T): T {
    if (this.rows.has(row.id)) throw new Error(`duplicate id ${row.id}`);
    this.rows.set(row.id, structuredClone(row));
    return structuredClone(row);
  }
  get(id: string): T | undefined {
    const r = this.rows.get(id);
    return r && structuredClone(r);
  }
  update(id: string, patch: Partial<T>): T {
    const r = this.rows.get(id);
    if (!r) throw new Error(`no row ${id}`);
    const next = { ...r, ...patch };
    this.rows.set(id, next);
    return structuredClone(next);
  }
  find(pred: (r: T) => boolean): T[] {
    return [...this.rows.values()].filter(pred).map((r) => structuredClone(r));
  }
  clear(): void {
    this.rows.clear();
  }
}
