import { initConfig } from '../src/config.ts';

export const baseEnv = {
  NODE_ENV: 'test',
  SESSION_SECRET: 'x'.repeat(32),
  SMTP_HOST: 'smtp.test',
};

export const testConfig = (overrides: Record<string, string> = {}) => initConfig({ ...baseEnv, ...overrides });
