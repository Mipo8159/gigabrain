/** Non-2xx answer from the pricing service. */
export class PricingHttpError extends Error {
  constructor(readonly status: number, readonly sku: string) {
    super(`pricing answered ${status} for ${sku}`);
    this.name = 'PricingHttpError';
  }
}
