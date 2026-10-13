import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDynamo } from './fake-ddb.ts';

const fake = new FakeDynamo({ payments: ['paymentId'] });
let recordPayment: typeof import('../src/payments.ts').recordPayment;

// Real DynamoDB semantics the fake keeps: reads are eventually consistent unless ConsistentRead is set,
// so an item written in the last second may not be visible yet; reads take a little time.
function dynamoTiming() {
  fake.hook = async (op, req) => {
    if (op === 'GetItem' || op === 'Query') {
      await new Promise(r => setTimeout(r, 15));
      if (op === 'GetItem' && !req.ConsistentRead) {
        const row = fake.table(req.TableName).get(fake.keyOf(req.TableName, req.Key));
        if (row && Date.now() - row.writtenAt < 1000) return { body: {} };
      }
    }
    return undefined;
  };
}

before(async () => {
  await fake.start();
  process.env.PAYMENTS_TABLE = 'payments';
  ({ recordPayment } = await import('../src/payments.ts'));
});
after(() => fake.stop());
beforeEach(() => { fake.reset(); dynamoTiming(); });

const pay = (amountCents: number) => ({ paymentId: 'pay_1', orderId: 'ord_9', amountCents, currency: 'EUR' });
const storedAmount = () => Number(fake.get('payments', { paymentId: { S: 'pay_1' } })?.amountCents?.N);

test('first delivery is created and stored', async () => {
  const r = await recordPayment(pay(1000));
  assert.equal(r.status, 'created');
  assert.deepEqual(r.payment, pay(1000));
  assert.equal(storedAmount(), 1000);
});

test('a redelivery right after returns the stored payment, unchanged', async () => {
  await recordPayment(pay(1000));
  const r = await recordPayment(pay(1250));
  assert.equal(r.status, 'duplicate');
  assert.deepEqual(r.payment, pay(1000));
  assert.equal(storedAmount(), 1000);
});

test('two deliveries at the same moment: exactly one is created', async () => {
  const [a, b] = await Promise.all([recordPayment(pay(1000)), recordPayment(pay(1250))]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, ['created', 'duplicate']);
  const created = a.status === 'created' ? a : b;
  const dup = a.status === 'created' ? b : a;
  assert.equal(storedAmount(), created.payment.amountCents);
  assert.deepEqual(dup.payment, created.payment);
});
