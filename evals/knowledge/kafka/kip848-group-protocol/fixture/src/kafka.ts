import ck from '@confluentinc/kafka-javascript';

const { Kafka, logLevel } = ck.KafkaJS;

export const kafka = new Kafka({
  kafkaJS: {
    clientId: 'shipment-tracker',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    logLevel: logLevel.ERROR,
  },
});
