type Level = 'debug' | 'info' | 'warn' | 'error';
const write = (level: Level, msg: string, fields: Record<string, unknown> = {}) => {
  if (process.env.LOG_SILENT) return;
  process.stdout.write(JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields }) + '\n');
};
export const log = {
  debug: (m: string, f?: Record<string, unknown>) => write('debug', m, f),
  info: (m: string, f?: Record<string, unknown>) => write('info', m, f),
  warn: (m: string, f?: Record<string, unknown>) => write('warn', m, f),
  error: (m: string, f?: Record<string, unknown>) => write('error', m, f),
};
