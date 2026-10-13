/** Typed, validated settings. Parse once with initConfig(); read with config(). */

type Parser<T> = (raw: string | undefined, key: string) => T;

const str = (def?: string): Parser<string> => (raw, key) => {
  const v = raw ?? def;
  if (v === undefined || v === '') throw new Error(`config: ${key} is required`);
  return v;
};
const int = (def?: number, min = Number.MIN_SAFE_INTEGER): Parser<number> => (raw, key) => {
  if (raw === undefined || raw === '') {
    if (def === undefined) throw new Error(`config: ${key} is required`);
    return def;
  }
  if (!/^-?\d+$/.test(raw)) throw new Error(`config: ${key} must be an integer, got "${raw}"`);
  const n = Number(raw);
  if (n < min) throw new Error(`config: ${key} must be >= ${min}`);
  return n;
};
const oneOf = <T extends string>(values: readonly T[], def: T): Parser<T> => (raw, key) => {
  const v = (raw ?? def) as T;
  if (!values.includes(v)) throw new Error(`config: ${key} must be one of ${values.join(', ')}`);
  return v;
};

const schema = {
  nodeEnv: ['NODE_ENV', oneOf(['development', 'test', 'production'] as const, 'development')],
  sessionSecret: ['SESSION_SECRET', (raw: string | undefined, key: string) => {
    const v = str()(raw, key);
    if (v.length < 32) throw new Error(`config: ${key} must be at least 32 characters`);
    return v;
  }],
  sessionTtlMinutes: ['SESSION_TTL_MINUTES', int(720, 1)],
  smtpHost: ['SMTP_HOST', str()],
  smtpPort: ['SMTP_PORT', int(587, 1)],
  mailFrom: ['MAIL_FROM', str('shop@example.com')],
} as const;

type Schema = typeof schema;
export type Config = { readonly [K in keyof Schema]: ReturnType<Schema[K][1]> };

export function loadConfig(env: Record<string, string | undefined>): Config {
  const out: Record<string, unknown> = {};
  for (const [name, [key, parse]] of Object.entries(schema)) out[name] = (parse as Parser<unknown>)(env[key], key);
  return Object.freeze(out) as Config;
}

let current: Config | undefined;

export function initConfig(env: Record<string, string | undefined> = process.env): Config {
  current = loadConfig(env);
  return current;
}

export function config(): Config {
  if (!current) throw new Error('config not initialised: call initConfig() first');
  return current;
}
