import { readFileSync, existsSync } from 'node:fs';

// Minimal .env reader (we don't want dotenv in the container image).
// A `#` starts a comment only at the start of a line or after whitespace, so values may contain `#`.
export function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/(^|\s)#.*$/, '').trim();
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

export function loadConfig(path = '.env') {
  const env = existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {};
  const get = (k, d) => process.env[k] ?? env[k] ?? d;
  return {
    db: {
      host: get('DB_HOST', 'localhost'),
      port: Number(get('DB_PORT', 5432)),
      user: get('DB_USER'),
      password: get('DB_PASSWORD'),
      database: get('DB_NAME'),
    },
    logLevel: get('LOG_LEVEL', 'info'),
  };
}
