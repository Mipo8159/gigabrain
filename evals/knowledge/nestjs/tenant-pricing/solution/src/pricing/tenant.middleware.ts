import { Injectable, NestMiddleware } from '@nestjs/common';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly ctx: TenantContext) {}

  use(req: { headers: Record<string, string | string[] | undefined> }, _res: unknown, next: () => void) {
    const header = req.headers['x-tenant'];
    const tenant = Array.isArray(header) ? header[0] : header;
    if (!tenant) return next();
    this.ctx.run(tenant, next);
  }
}
