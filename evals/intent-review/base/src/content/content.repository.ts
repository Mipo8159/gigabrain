import { Content } from './content.entity';

export class ContentRepository {
  private rows = new Map<string, Content>();
  private seq = 0;

  insert(data: Omit<Content, 'id'>): Content {
    const row = { ...data, id: String(++this.seq) };
    this.rows.set(row.id, row);
    return row;
  }
  findById(id: string): Content | undefined { return this.rows.get(id); }
  save(row: Content): Content { this.rows.set(row.id, row); return row; }
  listByRegion(regionId: string): Content[] {
    return [...this.rows.values()].filter((r) => r.regionId === regionId);
  }
}
