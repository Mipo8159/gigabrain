# Dead-letter topics

Every consumer that dead-letters writes to `<topic>.dlq` (passed in as config).
A dead-lettered record keeps the original **key** and **value bytes unchanged** and adds these headers:

| header | value |
|---|---|
| `dlq-original-topic` | source topic |
| `dlq-original-partition` | source partition, decimal string |
| `dlq-original-offset` | source offset, decimal string |
| `dlq-error` | short reason |

The on-call tooling replays from the DLQ by these headers, so they are required.
