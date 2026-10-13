// Builds the connection settings handed to the pg Pool.
export function poolOptions(config) {
  const { host, port, user, password, database } = config.db;
  if (!password) throw new Error('DB_PASSWORD is not set');
  return { host, port, user, password, database, max: 10, idleTimeoutMillis: 30_000 };
}
