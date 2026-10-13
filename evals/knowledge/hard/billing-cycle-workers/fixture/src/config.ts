function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`missing env ${name}`);
  return v;
}

export const config = {
  databaseUrl: env('DATABASE_URL', 'postgres://postgres:pg@127.0.0.1:5432/billing'),
  pspUrl: env('PSP_URL', 'https://api.psp.example'),
  pspKey: env('PSP_KEY', ''),
  adminPort: Number(env('ADMIN_PORT', '8081')),
  cycleEveryMs: Number(env('CYCLE_EVERY_MS', '60000')),
};
