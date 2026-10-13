export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Config = {
  port: number;
  databaseUrl: string;
  logLevel: LogLevel;
  enableBetaCheckout: boolean;
  requestTimeoutMs: number;
  maxUploadMb?: number;
};

export function loadConfig(env: Record<string, string | undefined>): Config {
  throw new Error('not implemented');
}
