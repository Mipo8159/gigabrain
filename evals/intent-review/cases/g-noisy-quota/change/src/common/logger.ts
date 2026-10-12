type Level = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  constructor(private readonly scope: string) {}

  private write(level: Level, msg: string, meta?: Record<string, unknown>) {
    const line = { ts: new Date().toISOString(), level, scope: this.scope, msg, ...meta };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(line));
  }

  debug(msg: string, meta?: Record<string, unknown>) { this.write('debug', msg, meta); }
  info(msg: string, meta?: Record<string, unknown>) { this.write('info', msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>) { this.write('warn', msg, meta); }
  error(msg: string, meta?: Record<string, unknown>) { this.write('error', msg, meta); }
}
