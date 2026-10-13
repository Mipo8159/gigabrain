import type { ImportDeps } from './run-import.ts';
import { runImport } from './run-import.ts';
import { markFailed } from './repo.ts';
import { log } from '../logger.ts';

/**
 * Claims the oldest open import (pending, or running but orphaned by a dead pod) and runs it.
 * The claim is a session-free lease: `started_at` older than the lease means the previous owner died.
 */
export async function workOnce(deps: ImportDeps, leaseSeconds = 120): Promise<string | null> {
  const r = await deps.pool.query<{ id: string }>(
    `UPDATE imports SET status = 'running', started_at = now()
      WHERE id = (SELECT id FROM imports
                   WHERE status = 'pending' OR (status = 'running' AND started_at < now() - make_interval(secs => $1))
                   ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING id::text`, [leaseSeconds]);
  const id = r.rows[0]?.id;
  if (!id) return null;
  const heartbeat = setInterval(() => {
    deps.pool.query('UPDATE imports SET started_at = now() WHERE id = $1 AND status = $2', [id, 'running']).catch(() => {});
  }, (leaseSeconds * 1000) / 4);
  try {
    const p = await runImport(deps, id, { onProgress: (x) => log.info('import progress', { id, ...x }) });
    log.info('import done', { id, ...p });
  } catch (e) {
    log.error('import failed', { id, err: String(e) });
    await markFailed(deps.pool, id, String(e)).catch(() => {});
  } finally {
    clearInterval(heartbeat);
  }
  return id;
}
