import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

/** Every service builds its DynamoDB client here so settings stay in one place. */
export function createDynamoClient(config: DynamoDBClientConfig = {}): DynamoDBClient {
  return new DynamoDBClient({
    maxAttempts: 2, // includes the first attempt
    requestHandler: {
      connectionTimeout: 500,
      requestTimeout: 500,
    },
    ...config,
  });
}
