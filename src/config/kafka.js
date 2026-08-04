const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "vaultdrive",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || "vaultdrive-group",
});

module.exports = { kafka, producer, consumer };
