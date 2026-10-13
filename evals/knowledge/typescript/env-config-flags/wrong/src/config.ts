import { z } from 'zod';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Config = {
  port: number;
  databaseUrl: string;
  logLevel: LogLevel;
  enableBetaCheckout: boolean;
  requestTimeoutMs: number;
  maxUploadMb?: number;
};

// Helm renders unset values as "", treat those as missing
const blankAsUnset = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const Env = z.object({
  PORT: z.preprocess(blankAsUnset, z.coerce.number().int().min(1).max(65535).default(8080)),
  DATABASE_URL: z.preprocess(blankAsUnset, z.string()),
  LOG_LEVEL: z.preprocess(blankAsUnset, z.enum(['debug', 'info', 'warn', 'error']).default('info')),
  ENABLE_BETA_CHECKOUT: z.preprocess(blankAsUnset, z.coerce.boolean().default(false)),
  REQUEST_TIMEOUT_MS: z.preprocess(blankAsUnset, z.coerce.number().int().positive().default(5000)),
  MAX_UPLOAD_MB: z.preprocess(blankAsUnset, z.coerce.number().int().positive().optional()),
});

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`invalid config: ${details}`);
  }
  const e = parsed.data;
  const config: Config = {
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    logLevel: e.LOG_LEVEL,
    enableBetaCheckout: e.ENABLE_BETA_CHECKOUT,
    requestTimeoutMs: e.REQUEST_TIMEOUT_MS,
  };
  if (e.MAX_UPLOAD_MB !== undefined) config.maxUploadMb = e.MAX_UPLOAD_MB;
  return config;
}
