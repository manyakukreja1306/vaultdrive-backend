const UPLOAD_TOPIC = "file-uploads";

/**
 * Creates a structured upload event payload for Kafka.
 */
function createUploadEvent({ fileReferenceId, userId, sha256Hash, sizeBytes, mimeType, wasDeduplicated, bytesSaved }) {
  return {
    topic: UPLOAD_TOPIC,
    messages: [
      {
        key: userId,
        value: JSON.stringify({
          eventType: "FILE_UPLOADED",
          fileReferenceId,
          userId,
          sha256Hash,
          sizeBytes,
          mimeType,
          wasDeduplicated,
          bytesSaved,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  };
}

module.exports = { createUploadEvent, UPLOAD_TOPIC };
