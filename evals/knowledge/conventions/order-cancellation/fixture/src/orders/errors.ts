export class OrderStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderStateError';
  }
}
export class OutOfStockError extends Error {
  readonly sku: string;
  constructor(sku: string) {
    super(`out of stock: ${sku}`);
    this.sku = sku;
    this.name = 'OutOfStockError';
  }
}
