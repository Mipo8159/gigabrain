import { Controller, Get, Query } from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get('total')
  total(@Query('skus') skus = '') {
    const list = skus.split(',').filter(Boolean);
    return { skus: list, total: this.cart.total(list) };
  }
}
