import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { createClient } from 'redis';
import { APP_CONFIG, AppConfig } from '../config';

export const REDIS = Symbol('REDIS');
export type RedisClient = ReturnType<typeof createClient>;

@Injectable()
class RedisCloser implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}
  async onApplicationShutdown() {
    if (this.redis.isOpen) await this.redis.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [APP_CONFIG],
      useFactory: async (cfg: AppConfig) => {
        const client = createClient({ url: cfg.redisUrl });
        client.on('error', (e) => console.error('redis error', e));
        await client.connect();
        return client;
      },
    },
    RedisCloser,
  ],
  exports: [REDIS],
})
export class RedisModule {}
