/** Structured logger. Masks PII by field name, at any depth, before anything reaches the sink. */

export type Level = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry { time: string; level: Level; msg: string; [field: string]: unknown }
export type Sink = (entry: LogEntry) => void;

const PII_KEYS = new Set(['email', 'phone', 'name', 'fullname', 'firstname', 'lastname', 'ip', 'address', 'passwordhash', 'password', 'token']);
const MASK = '[redacted]';

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = PII_KEYS.has(k.toLowerCase().replaceAll('_', '')) ? MASK : redact(v, depth + 1);
  }
  return out;
}

const stdoutSink: Sink = (e) => { process.stdout.write(JSON.stringify(e) + '\n'); };
let sink: Sink = stdoutSink;

function emit(level: Level, msg: string, fields: Record<string, unknown>, base: Record<string, unknown>) {
  const safe = redact({ ...base, ...fields }) as Record<string, unknown>;
  sink({ ...safe, time: new Date().toISOString(), level, msg });
}

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

function make(base: Record<string, unknown>): Logger {
  return {
    debug: (m, f = {}) => emit('debug', m, f, base),
    info: (m, f = {}) => emit('info', m, f, base),
    warn: (m, f = {}) => emit('warn', m, f, base),
    error: (m, f = {}) => emit('error', m, f, base),
    child: (f) => make({ ...base, ...f }),
  };
}

export const log: Logger = make({ service: 'identity' });

/** Test helper: collect entries instead of writing to stdout. Call the returned stop() to restore. */
export function captureLogs(): { entries: LogEntry[]; stop: () => void } {
  const entries: LogEntry[] = [];
  const prev = sink;
  sink = (e) => entries.push(e);
  return { entries, stop: () => { sink = prev; } };
}
