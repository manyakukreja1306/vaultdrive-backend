const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

exports.uploadFile = async (fileBuffer, mimeType, s3Key) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: mimeType,
  });
  await s3Client.send(command);
  return s3Key;
};

exports.generatePresignedUrl = async (s3Key, expiresInSeconds = 900) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

exports.deleteObject = async (s3Key) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key });
  await s3Client.send(command);
};