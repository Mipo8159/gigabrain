# Money in billing-core

- Amounts are `Money` values (`src/lib/money.ts`): an integer number of minor units (cents) plus a
  currency. Never store or compute amounts as floating point major units.
- Percentages (tax, discounts) are basis points (`2000` = 20%). Apply them with `Money#percent`, which
  rounds half to even ("banker's rounding"), as agreed with finance in 2024 to match the ledger system.
- Tax is computed per invoice line and then summed, so every line has a well-defined tax amount.
- Splitting an amount into parts uses `Money#allocate`, never division.
