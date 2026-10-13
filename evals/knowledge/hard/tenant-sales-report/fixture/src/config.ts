export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  pricingUrl: string;
};

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? 'postgres://app_rw:app_rw@127.0.0.1:5432/analytics',
    redisUrl: env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    pricingUrl: (env.PRICING_URL ?? 'http://pricing.internal').replace(/\/$/, ''),
  };
}
