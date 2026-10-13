import type { RedisClientType } from 'redis';
import type { Profile, ProfileStore } from './store.ts';

export type ProfileCacheOptions = { ttlSeconds: number };

export function createProfileCache(redis: RedisClientType, store: ProfileStore, opts: ProfileCacheOptions) {
  const key = (id: string) => `profile:${id}`;

  return {
    async get(id: string): Promise<Profile | null> {
      const hit = await redis.get(key(id));
      if (hit !== null) return JSON.parse(hit) as Profile;
      const profile = await store.get(id);
      if (profile) await redis.set(key(id), JSON.stringify(profile), { expiration: { type: 'EX', value: opts.ttlSeconds } });
      return profile;
    },

    async update(id: string, patch: Partial<Pick<Profile, 'displayName' | 'avatarUrl'>>): Promise<Profile> {
      const profile = await store.update(id, patch);
      // Invalidate rather than write through: concurrent updates on different instances could otherwise
      // leave an older copy in the cache. The next read repopulates it from the store.
      await redis.del(key(id));
      return profile;
    },
  };
}
