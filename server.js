require("dotenv").config();
const app = require("./src/app");
const { connectProducer } = require("./src/services/kafkaProducerService");
const { startConsumer } = require("./src/services/kafkaConsumerService");

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Connect Kafka producer and start consumer
  try {
    await connectProducer();
    await startConsumer();
  } catch (err) {
    console.error("Kafka startup error (non-fatal):", err.message);
  }
});
