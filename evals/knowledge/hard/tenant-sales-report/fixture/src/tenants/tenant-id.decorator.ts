import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The tenant set by TenantGuard. */
export const TenantId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().tenantId;
});
