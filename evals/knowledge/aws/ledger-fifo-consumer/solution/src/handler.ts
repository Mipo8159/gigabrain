import type { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { ledger, type LedgerEntry } from './ledger.ts';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: SQSBatchResponse['batchItemFailures'] = [];
  for (const [i, record] of event.Records.entries()) {
    try {
      await ledger.apply(JSON.parse(record.body) as LedgerEntry);
    } catch (err) {
      console.error('ledger entry failed', record.messageId, err);
      // FIFO: stop here and hand back this message and everything after it, so no later
      // message in a group is applied before the one that failed.
      for (const r of event.Records.slice(i)) failures.push({ itemIdentifier: r.messageId });
      break;
    }
  }
  return { batchItemFailures: failures };
};
