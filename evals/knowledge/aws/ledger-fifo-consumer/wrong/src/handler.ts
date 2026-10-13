import type { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { ledger, type LedgerEntry } from './ledger.ts';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  // Records arrive in send order per message group, so process them sequentially.
  for (const record of event.Records) {
    try {
      const entry = JSON.parse(record.body) as LedgerEntry;
      await ledger.apply(entry);
    } catch (err) {
      console.error('failed to apply ledger entry', record.messageId, err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
