import type { RedisClientType } from 'redis';
import type { Product, ProductRepo } from './repo.ts';

export type ProductCacheOptions = { ttlSeconds: number };

const WARM_BATCH_SIZE = 1000;

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
    await this.redis.set(this.key(id), JSON.stringify(p), { expiration: { type: 'EX', value: this.ttlSeconds } });
    return p;
  }

  async warm(ids: string[]): Promise<void> {
    // One findMany + one MSET per batch keeps the deploy warm-up to a handful of round trips.
    for (let i = 0; i < ids.length; i += WARM_BATCH_SIZE) {
      const products = await this.repo.findMany(ids.slice(i, i + WARM_BATCH_SIZE));
      if (products.length === 0) continue;
      await this.redis.mSet(products.map((p) => [this.key(p.id), JSON.stringify(p)] as [string, string]));
    }
  }
}
