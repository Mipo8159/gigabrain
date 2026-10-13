import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ProductsController } from './products.controller';

@Module({ imports: [PricingModule], controllers: [ProductsController] })
export class ProductsModule {}
