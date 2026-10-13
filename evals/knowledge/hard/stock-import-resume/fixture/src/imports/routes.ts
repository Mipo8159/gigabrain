import type { Router } from '../http/router.ts';
import type { AppDeps } from '../app.ts';
import { HttpError } from '../http/errors.ts';
import { createImport, getImport } from './repo.ts';

export function registerImportRoutes(router: Router, deps: AppDeps) {
  router.post('/imports', async (ctx) => {
    const b = (await ctx.body()) as { warehouseId?: unknown; fileKey?: unknown } | undefined;
    if (typeof b?.warehouseId !== 'string' || typeof b?.fileKey !== 'string' || !b.fileKey.endsWith('.csv')) {
      throw new HttpError(400, 'warehouseId and fileKey (.csv) are required');
    }
    const size = await deps.storage.size(b.fileKey);
    if (size === null) throw new HttpError(422, 'file not uploaded yet');
    const id = await createImport(deps.pool, { warehouseId: b.warehouseId, fileKey: b.fileKey });
    return { status: 202, body: { id } };
  });

  router.get('/imports/:id', async ({ params }) => {
    const job = await getImport(deps.pool, params.id);
    if (!job) throw new HttpError(404, 'import not found');
    return { status: 200, body: job };
  });
}
