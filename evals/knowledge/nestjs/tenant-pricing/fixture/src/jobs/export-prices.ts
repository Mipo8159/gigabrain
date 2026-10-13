import 'reflect-metadata';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PricingService } from '../pricing/pricing.service';

/** Nightly export: SKU -> price. */
export async function exportPrices(app: INestApplicationContext): Promise<Record<string, number>> {
  const pricing = app.get(PricingService);
  return Object.fromEntries(pricing.skus().map((sku) => [sku, pricing.quote(sku)]));
}

if (require.main === module) {
  void (async () => {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    console.log(JSON.stringify(await exportPrices(app)));
    await app.close();
  })();
}
