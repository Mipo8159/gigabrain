import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Region, credentials and endpoint come from the environment.
export const ddb = new DynamoDBClient({});
export const doc = DynamoDBDocumentClient.from(ddb);

export const ordersTable = () => {
  const t = process.env.ORDERS_TABLE;
  if (!t) throw new Error('ORDERS_TABLE is not set');
  return t;
};
