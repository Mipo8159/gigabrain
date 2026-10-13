import ck from '@confluentinc/kafka-javascript';

const { Kafka, logLevel } = ck.KafkaJS;

// Shared client for the service. Already migrated to the Confluent client.
export const kafka = new Kafka({
  kafkaJS: {
    clientId: 'audit-svc',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    logLevel: logLevel.ERROR,
  },
});
