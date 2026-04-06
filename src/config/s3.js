const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

exports.uploadFile = async (file, key) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer
  };

  return s3.upload(params).promise();
};