import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Region, credentials and endpoint come from the environment.
export const ddb = new DynamoDBClient({});
// removeUndefinedValues: nested undefined fields throw otherwise.
// Integers above 2^53 unmarshall to bigint by default; callers must serialise them (see orders.ts).
export const doc = DynamoDBDocumentClient.from(ddb, { marshallOptions: { removeUndefinedValues: true } });

export const ordersTable = () => {
  const t = process.env.ORDERS_TABLE;
  if (!t) throw new Error('ORDERS_TABLE is not set');
  return t;
};
