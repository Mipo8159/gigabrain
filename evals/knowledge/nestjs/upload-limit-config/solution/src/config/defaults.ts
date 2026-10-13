/**
 * App settings with their local-dev defaults.
 * @nestjs/config 4 resolves load() values before process.env, so env overrides must be read here.
 */
const num = (name: string, fallback: number) => {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : Number(raw);
};

export default () => ({
  PORT: num('PORT', 3000),
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  PROJECTS_PAGE_SIZE: num('PROJECTS_PAGE_SIZE', 20),
  MAX_UPLOAD_MB: num('MAX_UPLOAD_MB', 10),
});
