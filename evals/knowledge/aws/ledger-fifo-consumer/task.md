---
timeout: 600
deps: aws
---
Please write the Lambda consumer for the `ledger-entries.fifo` SQS queue in `src/handler.ts`.

```ts
import type { SQSEvent, SQSBatchResponse } from 'aws-lambda';
export const handler: (event: SQSEvent) => Promise<SQSBatchResponse>;
```

- Each message body is a JSON `LedgerEntry` (see `src/ledger.ts`). Apply it with `ledger.apply(entry)`.
- Producers send with `MessageGroupId` = the account id. Entries for one account must be applied in the
  order they were sent: balances are computed incrementally, so applying a debit before the credit it
  depends on breaks the account.
- `ledger.apply` sometimes throws (DynamoDB throttling, an account temporarily locked by reconciliation).
  An entry that fails must be retried later; entries that were applied must not be applied again.
- The event source mapping has `ReportBatchItemFailures` enabled, batch size 10.

`@types/aws-lambda` is installed; don't add dependencies. Add a test of your own if you like (`node --test`).
