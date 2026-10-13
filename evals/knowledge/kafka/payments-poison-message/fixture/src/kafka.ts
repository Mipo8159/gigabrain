import { Kafka, logLevel } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'ledger-consumer',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  logLevel: logLevel.NOTHING,
});
