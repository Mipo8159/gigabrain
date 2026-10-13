---
timeout: 600
check: node hidden/grade.cjs
---
Support ticket #4471: a customer bought 3 × "Enamel mug" (12.50 each) with coupon `TENOFF` (10% off) and the
checkout charged them 11.25. It should have been 33.75. Other orders look fine as far as we know.
Totals come from `cartTotal` in `src/cart.js`. Please fix it.
