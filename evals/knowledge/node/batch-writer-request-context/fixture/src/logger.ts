import { requestContext } from './context.ts';

export type LogLine = { level: 'info' | 'error'; msg: string; requestId?: string; [k: string]: unknown };

export const log = {
  write: (line: LogLine) => { process.stdout.write(JSON.stringify(line) + '\n'); },
  info(msg: string, extra: Record<string, unknown> = {}) {
    log.write({ level: 'info', msg, requestId: requestContext.getStore()?.requestId, ...extra });
  },
  error(msg: string, extra: Record<string, unknown> = {}) {
    log.write({ level: 'error', msg, requestId: requestContext.getStore()?.requestId, ...extra });
  },
};
