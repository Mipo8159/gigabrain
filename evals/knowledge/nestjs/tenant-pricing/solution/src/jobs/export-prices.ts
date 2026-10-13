import 'reflect-metadata';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PricingService } from '../pricing/pricing.service';

/** Nightly export: SKU -> price for one tenant. */
export async function exportPrices(app: INestApplicationContext, tenant: string): Promise<Record<string, number>> {
  const pricing = app.get(PricingService);
  return Object.fromEntries(pricing.skus().map((sku) => [sku, pricing.quote(sku, tenant)]));
}

if (require.main === module) {
  void (async () => {
    const tenant = process.argv[2];
    if (!tenant) throw new Error('usage: export-prices <tenant>');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    console.log(JSON.stringify(await exportPrices(app, tenant)));
    await app.close();
  })();
}
