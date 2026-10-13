import { Kafka, logLevel } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'invoice-mailer',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  logLevel: logLevel.NOTHING,
});
