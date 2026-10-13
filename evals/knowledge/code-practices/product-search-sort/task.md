---
timeout: 600
---
The storefront needs search and sorting on the product list (`GET /products?q=&sort=&dir=`). The route in
`src/server.ts` already parses the query string and calls `searchProducts`; implement it in `src/products.ts`:

```ts
export function searchProducts(
  db: DatabaseSync,                                   // node:sqlite, schema in src/db.ts
  params: { q?: string; sort?: string; dir?: string },
): Product[]
```

- `q`: case-insensitive "name contains" search. Shoppers type whatever they like here
  (`"50% off"`, `"usb_c"`, `"o'neill"`).
- `sort`: `name` (default), `price` or `newest` (by `created_at`). `dir`: `asc` (default) or `desc`.
- Unknown `sort` or `dir` values: throw the `ValidationError` from `src/errors.ts` (the route turns it into a 400).
- Return at most 50 products.

Node 24, `node:sqlite`, no new dependencies. Add tests of your own if you like (`node --test`).
