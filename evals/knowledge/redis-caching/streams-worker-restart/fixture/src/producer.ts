import type { RedisClientType } from 'redis';

export async function enqueueThumbnail(redis: RedisClientType, imageId: string, size: number): Promise<string> {
  return redis.xAdd('thumbs', '*', { imageId, size: String(size) });
}
