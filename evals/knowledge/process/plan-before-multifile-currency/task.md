---
timeout: 900
heldout: true
check: node hidden/grade.cjs
---
We're starting to sell in the EU, so products need a currency. Today every price is implicitly USD.

- A product has a `currency`: an ISO 4217 code, three uppercase letters (`"EUR"`). Products created before
  this change, and new ones that don't send one, are `"USD"`.
- `POST /products` accepts an optional `currency`; an invalid one is a 400 like the other validation errors.
- API responses show the price as `"price": { "amountCents": 1299, "currency": "EUR" }` instead of the bare
  `"priceCents"` number (the mobile team signed off on the breaking change).
- `GET /products?currency=EUR` filters by currency.

`npm test` runs the suite; keep it green and cover the new behaviour.
