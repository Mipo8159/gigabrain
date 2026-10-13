import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Current tenant for the running request/job, via AsyncLocalStorage.
 * A singleton on purpose: a REQUEST-scoped provider would make PricingService (and everything
 * that injects it) request-scoped too, re-create it per request and skip its onModuleInit.
 */
@Injectable()
export class TenantContext {
  private readonly als = new AsyncLocalStorage<string>();

  run<T>(tenant: string, fn: () => T): T {
    return this.als.run(tenant, fn);
  }

  current(): string | undefined {
    return this.als.getStore();
  }
}
