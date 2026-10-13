import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { ledger, type LedgerEntry } from '../src/ledger.ts';
import { handler } from '../src/handler.ts';

const applied: string[] = [];
let failing = new Set<string>();
beforeEach(() => {
  applied.length = 0;
  failing = new Set();
  ledger.apply = async (e: LedgerEntry) => {
    await new Promise(r => setTimeout(r, 1));
    if (failing.has(e.entryId)) throw new Error(`throttled: ${e.entryId}`);
    applied.push(e.entryId);
  };
});

let seq = 0;
function record(entryId: string, accountId: string): SQSRecord {
  seq++;
  const entry: LedgerEntry = { entryId, accountId, amountCents: 100, postedAt: '2026-10-12T10:00:00Z' };
  return {
    messageId: `msg-${entryId}-${seq}`,
    receiptHandle: `rh-${seq}`,
    body: JSON.stringify(entry),
    attributes: {
      ApproximateReceiveCount: '1', SentTimestamp: '1760263200000', SenderId: 'AIDA', ApproximateFirstReceiveTimestamp: '1760263200000',
      SequenceNumber: String(18800000000000000000n + BigInt(seq)), MessageGroupId: accountId, MessageDeduplicationId: entryId,
    },
    messageAttributes: {},
    md5OfBody: 'x',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789012:ledger-entries.fifo',
    awsRegion: 'eu-west-1',
  };
}
const event = (recs: SQSRecord[]): SQSEvent => ({ Records: recs });

/** The invariants that keep ledgers correct under FIFO + partial batch response. */
function checkBatch(recs: SQSRecord[], reported: string[]) {
  const ids = new Set(recs.map(r => r.messageId));
  for (const id of reported) assert.ok(ids.has(id), `reported unknown itemIdentifier ${id}`);
  const entryOf = (r: SQSRecord) => JSON.parse(r.body).entryId as string;
  for (const r of recs) {
    const done = applied.includes(entryOf(r));
    const back = reported.includes(r.messageId);
    assert.ok(done !== back, `${entryOf(r)}: applied=${done} reported=${back} (must be exactly one)`);
  }
  const groups = new Map<string, SQSRecord[]>();
  for (const r of recs) groups.set(r.attributes.MessageGroupId!, [...(groups.get(r.attributes.MessageGroupId!) ?? []), r]);
  for (const [g, rs] of groups) {
    const flags = rs.map(r => applied.includes(entryOf(r)));
    const firstNotApplied = flags.indexOf(false);
    if (firstNotApplied >= 0) {
      assert.ok(flags.slice(firstNotApplied).every(f => !f), `group ${g}: an entry was applied after an earlier one failed (${flags})`);
    }
  }
}

test('all good: nothing reported', async () => {
  const recs = [record('a1', 'A'), record('b1', 'B'), record('a2', 'A')];
  const out = await handler(event(recs));
  assert.deepEqual(out.batchItemFailures, []);
  assert.deepEqual(applied, ['a1', 'b1', 'a2']);
});

test('a failure in the middle keeps every account in order and nothing is applied twice', async () => {
  failing = new Set(['a2']);
  const recs = [record('a1', 'A'), record('b1', 'B'), record('a2', 'A'), record('b2', 'B'), record('a3', 'A'), record('a4', 'A')];
  const out = await handler(event(recs));
  const reported = out.batchItemFailures.map(f => f.itemIdentifier);
  assert.ok(reported.length > 0, 'the failed entry must be reported for retry');
  checkBatch(recs, reported);
});

test('the first message fails', async () => {
  failing = new Set(['c1']);
  const recs = [record('c1', 'C'), record('c2', 'C'), record('c3', 'C')];
  const out = await handler(event(recs));
  checkBatch(recs, out.batchItemFailures.map(f => f.itemIdentifier));
});

test('a failure never rejects the invocation', async () => {
  failing = new Set(['d2']);
  const recs = [record('d1', 'D'), record('d2', 'D')];
  await assert.doesNotReject(() => handler(event(recs)));
});
