import { Kafka, logLevel } from 'kafkajs';
import { config } from './config.ts';

export function createKafka(clientId = 'orders-service'): Kafka {
  return new Kafka({ clientId, brokers: config.kafkaBrokers, logLevel: logLevel.WARN });
}
