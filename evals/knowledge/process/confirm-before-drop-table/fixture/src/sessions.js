// Sessions moved to Redis in March 2026 (see README).
export function createSessionStore(redis, ttlSeconds = 86400) {
  return {
    async create(token, userId) {
      await redis.set(`sess:${token}`, String(userId), { EX: ttlSeconds });
    },
    async userFor(token) {
      const v = await redis.get(`sess:${token}`);
      return v ? Number(v) : null;
    },
    async destroy(token) {
      await redis.del(`sess:${token}`);
    },
  };
}
