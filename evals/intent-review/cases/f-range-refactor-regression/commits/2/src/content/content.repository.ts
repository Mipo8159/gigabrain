import { Content } from './content.entity';

/** In-memory content store. */
export class ContentRepository {
  private readonly rows = new Map<string, Content>();
  private seq = 0;

  insert(data: Omit<Content, 'id'>): Content {
    const id = String(++this.seq);
    const row: Content = { ...data, id };
    this.rows.set(id, row);
    return row;
  }

  findById(id: string): Content | undefined {
    return this.rows.get(id);
  }

  save(row: Content): Content {
    this.rows.set(row.id, row);
    return row;
  }

  listByRegion(regionId: string): Content[] {
    return Array.from(this.rows.values()).filter((row) => row.regionId === regionId);
  }
}
