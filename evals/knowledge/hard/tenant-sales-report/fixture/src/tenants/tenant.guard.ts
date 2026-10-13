import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DbService } from '../database/db.service';

/** Requires a known X-Tenant-Id (the gateway authenticates the merchant and sets it). */
@Injectable()
export class TenantGuard implements CanActivate {
  private known = new Map<string, number>();

  constructor(private readonly db: DbService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const id = req.headers['x-tenant-id'];
    if (typeof id !== 'string' || !id) throw new UnauthorizedException('X-Tenant-Id required');
    const until = this.known.get(id);
    if (!until || until < Date.now()) {
      const r = await this.db.query('SELECT 1 FROM tenants WHERE id = $1', [id]);
      if (r.rowCount === 0) throw new ForbiddenException('unknown tenant');
      this.known.set(id, Date.now() + 60_000);
    }
    req.tenantId = id;
    return true;
  }
}
