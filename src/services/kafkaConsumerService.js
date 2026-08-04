const { consumer } = require("../config/kafka");
const { UPLOAD_TOPIC } = require("../kafka/uploadEvent");

const startConsumer = async () => {
  try {
    await consumer.connect();
    console.log("Kafka consumer connected");

    await consumer.subscribe({ topic: UPLOAD_TOPIC, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`[Kafka] Received event: ${event.eventType}`, {
            userId: event.userId,
            fileReferenceId: event.fileReferenceId,
            wasDeduplicated: event.wasDeduplicated,
            bytesSaved: event.bytesSaved,
          });

          // Future: trigger analytics refresh, send notifications, etc.
        } catch (parseErr) {
          console.error("[Kafka] Failed to parse message:", parseErr.message);
        }
      },
    });
  } catch (err) {
    console.error("Kafka consumer failed to start:", err.message);
  }
};

const stopConsumer = async () => {
  await consumer.disconnect();
  console.log("Kafka consumer disconnected");
};

module.exports = { startConsumer, stopConsumer };
