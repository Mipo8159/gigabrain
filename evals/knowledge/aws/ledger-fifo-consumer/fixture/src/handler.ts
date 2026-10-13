import type { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { ledger, type LedgerEntry } from './ledger.ts';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  throw new Error('not implemented');
};
