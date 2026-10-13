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
    throw new Error('not implemented');
  }

  async warm(ids: string[]): Promise<void> {
    throw new Error('not implemented');
  }
}
