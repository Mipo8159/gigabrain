import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Region, credentials and endpoint come from the environment.
export const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const paymentsTable = () => {
  const t = process.env.PAYMENTS_TABLE;
  if (!t) throw new Error('PAYMENTS_TABLE is not set');
  return t;
};
