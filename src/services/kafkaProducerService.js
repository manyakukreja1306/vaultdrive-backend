const { producer } = require("../config/kafka");

let isConnected = false;

const connectProducer = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log("Kafka producer connected");
  }
};

const publishEvent = async (event) => {
  try {
    await connectProducer();
    await producer.send(event);
  } catch (err) {
    console.error("Kafka publish error:", err.message);
    // Non-fatal — don't throw, just log
  }
};

const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log("Kafka producer disconnected");
  }
};

module.exports = { publishEvent, connectProducer, disconnectProducer };
