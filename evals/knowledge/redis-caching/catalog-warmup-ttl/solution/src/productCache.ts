import type { RedisClientType } from 'redis';
import type { Product, ProductRepo } from './repo.ts';

export type ProductCacheOptions = { ttlSeconds: number };

export class ProductCache {
  private redis: RedisClientType;
  private repo: ProductRepo;
  private ttlSeconds: number;

  constructor(redis: RedisClientType, repo: ProductRepo, opts: ProductCacheOptions) {
    this.redis = redis;
    this.repo = repo;
    this.ttlSeconds = opts.ttlSeconds;
  }

  key(id: string) { return `product:${id}`; }

  async get(id: string): Promise<Product | null> {
    const hit = await this.redis.get(this.key(id));
    if (hit !== null) return JSON.parse(hit) as Product;
    const p = await this.repo.find(id);
    if (p) await this.redis.set(this.key(id), JSON.stringify(p), { expiration: { type: 'EX', value: this.ttlSeconds } });
    return p;
  }

  async update(id: string, patch: Partial<Omit<Product, 'id'>>): Promise<Product> {
    const p = await this.repo.update(id, patch);
    // A plain SET discards the key's TTL: always pass the expiry again.
    await this.redis.set(this.key(id), JSON.stringify(p), { expiration: { type: 'EX', value: this.ttlSeconds } });
    return p;
  }

  async warm(ids: string[]): Promise<void> {
    // MSET cannot set a TTL; use a pipeline of SET ... EX per batch.
    for (let i = 0; i < ids.length; i += 1000) {
      const products = await this.repo.findMany(ids.slice(i, i + 1000));
      if (!products.length) continue;
      const m = this.redis.multi();
      for (const p of products) m.set(this.key(p.id), JSON.stringify(p), { expiration: { type: 'EX', value: this.ttlSeconds } });
      await m.execAsPipeline();
    }
  }
}
