function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`missing env ${name}`);
  return v;
}

export const config = {
  port: Number(env('PORT', '3000')),
  databaseUrl: env('DATABASE_URL', 'postgres://postgres:pg@127.0.0.1:5432/inventory'),
  storageBaseUrl: env('STORAGE_BASE_URL', 'http://127.0.0.1:9000/stock-imports'),
  storageToken: env('STORAGE_TOKEN', ''),
  workerPollMs: Number(env('WORKER_POLL_MS', '1000')),
};
