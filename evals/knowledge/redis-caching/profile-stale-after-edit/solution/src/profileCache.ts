import type { RedisClientType } from 'redis';
import { randomUUID } from 'node:crypto';
import type { Profile, ProfileStore } from './store.ts';

export type ProfileCacheOptions = { ttlSeconds: number };

// Lease-based cache-aside (Facebook memcache "leases"): a reader that misses takes a lease
// before reading the DB and may only fill the cache if the lease is still its own. A write
// deletes both the value and any outstanding lease, so a fill that read the old row is dropped.
const FILL = `
if redis.call('GET', KEYS[2]) == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  redis.call('DEL', KEYS[2])
  return 1
end
return 0`;

export function createProfileCache(redis: RedisClientType, store: ProfileStore, opts: ProfileCacheOptions) {
  const key = (id: string) => `profile:${id}`;
  const lease = (id: string) => `profile:${id}:lease`;

  return {
    async get(id: string): Promise<Profile | null> {
      const hit = await redis.get(key(id));
      if (hit !== null) return JSON.parse(hit) as Profile;
      const token = randomUUID();
      await redis.set(lease(id), token, { expiration: { type: 'PX', value: 10_000 } });
      const profile = await store.get(id);
      if (profile) {
        await redis.eval(FILL, { keys: [key(id), lease(id)], arguments: [token, JSON.stringify(profile), String(opts.ttlSeconds)] });
      }
      return profile;
    },

    async update(id: string, patch: Partial<Pick<Profile, 'displayName' | 'avatarUrl'>>): Promise<Profile> {
      const profile = await store.update(id, patch);
      await redis.del([key(id), lease(id)]);
      return profile;
    },
  };
}
