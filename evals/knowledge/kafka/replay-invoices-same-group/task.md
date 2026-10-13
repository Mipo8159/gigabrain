---
timeout: 900
deps: kafka
services: [kafka]
heldout: true
check: node --test --test-force-exit --test-reporter=dot 'hidden/**/*.test.*'
---
Last week's invoice template bug sent unreadable invoice emails. The template is fixed; now every invoice on `billing.invoices` has to be emailed again.

Please implement `replayInvoices(opts)` in `src/replay.ts` (kafkajs, same client as `src/mailer.ts`):

```ts
replayInvoices(opts: { topic: string; groupId: string; send: (inv: Invoice) => Promise<void> }): Promise<{ stop(): Promise<void> }>
```

- It should re-run the mailer over the whole topic, from the very first invoice, and keep going with anything new after that.
- Run it as the mailer's own consumer group (`opts.groupId`, i.e. `invoice-mailer`): finance's lag dashboard tracks that group, and when we scale the normal mailer back up it has to continue from where the replay got to, without mailing anything a third time.
- Runbook: the normal mailer deployment is scaled to 0 before the replay starts and stays at 0 while it runs. Some invoices may have arrived while the mailer was down; they need mailing too.
- `stop()` disconnects.

A broker is available locally (`KAFKA_BROKERS`, default `localhost:9092`) if you want to try it.
