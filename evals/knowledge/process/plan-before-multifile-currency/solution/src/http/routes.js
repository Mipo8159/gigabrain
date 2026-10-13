import { newProduct, ValidationError, isCurrency } from '../catalog/product.js';
import { productJson } from './serialize.js';

// Tiny framework-free router: handle(method, url, body) -> { status, body }
export function createRoutes(repo) {
  return function handle(method, url, body) {
    const u = new URL(url, 'http://x');
    if (method === 'GET' && u.pathname === '/products') {
      const currency = u.searchParams.get('currency');
      if (currency !== null && !isCurrency(currency)) return { status: 400, body: { error: 'bad currency' } };
      return { status: 200, body: repo.list({ currency: currency ?? undefined }).map(productJson) };
    }
    const m = u.pathname.match(/^\/products\/([^/]+)$/);
    if (method === 'GET' && m) {
      const p = repo.get(decodeURIComponent(m[1]));
      return p ? { status: 200, body: productJson(p) } : { status: 404, body: { error: 'not found' } };
    }
    if (method === 'POST' && u.pathname === '/products') {
      try {
        const p = newProduct(body ?? {});
        if (!repo.insert(p)) return { status: 409, body: { error: 'sku exists' } };
        return { status: 201, body: productJson(repo.get(p.sku)) };
      } catch (e) {
        if (e instanceof ValidationError) return { status: 400, body: { error: e.message } };
        throw e;
      }
    }
    return { status: 404, body: { error: 'not found' } };
  };
}
