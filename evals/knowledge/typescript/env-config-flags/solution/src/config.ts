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

const int = z.string().regex(/^\d+$/, 'must be an integer').transform(Number);

const Env = z.object({
  PORT: int.pipe(z.number().int().min(1).max(65535)).default(8080),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_BETA_CHECKOUT: z.stringbool().default(false),
  REQUEST_TIMEOUT_MS: int.pipe(z.number().int().positive()).default(5000),
  MAX_UPLOAD_MB: int.pipe(z.number().int().positive()).optional(),
});

export function loadConfig(env: Record<string, string | undefined>): Config {
  // empty string means "not set" (Helm renders unset values as "")
  const clean = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v.trim() !== ''));
  const r = Env.safeParse(clean);
  if (!r.success) {
    throw new Error('invalid config: ' + r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const e = r.data;
  return {
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    logLevel: e.LOG_LEVEL,
    enableBetaCheckout: e.ENABLE_BETA_CHECKOUT,
    requestTimeoutMs: e.REQUEST_TIMEOUT_MS,
    ...(e.MAX_UPLOAD_MB !== undefined && { maxUploadMb: e.MAX_UPLOAD_MB }),
  };
}
