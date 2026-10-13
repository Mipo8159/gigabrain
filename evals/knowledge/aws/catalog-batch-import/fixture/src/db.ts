import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Region, credentials and endpoint come from the environment.
export const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const productsTable = () => {
  const t = process.env.PRODUCTS_TABLE;
  if (!t) throw new Error('PRODUCTS_TABLE is not set');
  return t;
};
