---
timeout: 600
deps: aws
---
Last night a DynamoDB endpoint went bad in one AZ and our checkout API hung: requests sat open for minutes
until the load balancer cut them, and the whole fleet ran out of sockets. DynamoDB's p99 for us is about 15 ms,
so if an attempt hasn't answered in half a second it isn't going to.

Please change `createDynamoClient` in `src/db.ts` (every service builds its client through it) so that:

- an attempt that has not completed within **500 ms** is abandoned;
- a call makes **at most 2 attempts** in total, so a hung call errors out in roughly a second instead of hanging;
- normal calls (tens to a couple of hundred ms) keep working.

```ts
export function createDynamoClient(config?: DynamoDBClientConfig): DynamoDBClient
```

Callers pass region / endpoint / credentials through `config`; keep that working. We use AWS SDK v3
(installed, don't add dependencies). There is no AWS account here. Add a test of your own if you like (`node --test`).
