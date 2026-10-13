import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Region, credentials and endpoint come from the environment.
export const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const ticketsTable = () => {
  const t = process.env.TICKETS_TABLE;
  if (!t) throw new Error('TICKETS_TABLE is not set');
  return t;
};
