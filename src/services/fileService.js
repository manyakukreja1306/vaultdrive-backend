const crypto = require("crypto");
const repo = require("../repositories/fileRepository");
const s3 = require("../config/s3");
const redis = require("../config/redis");

exports.uploadFile = async (file) => {

  const hash = crypto
    .createHash("sha256")
    .update(file.buffer)
    .digest("hex");

  //  STEP 1: Check Redis first
  const cached = await redis.get(hash);

  if (cached) {
    return {
      message: "File already exists (cache)",
      reused: true,
      file: JSON.parse(cached)
    };
  }

  //  STEP 2: Check DB
  const existing = await repo.findByHash(hash);

  if (existing.rows.length > 0) {

    //  Save in Redis for next time
    await redis.set(hash, JSON.stringify(existing.rows[0]));

    return {
      message: "File already exists",
      reused: true,
      file: existing.rows[0]
    };
  }

  //  STEP 3: Upload to S3
  const key = hash + "-" + file.originalname;

  const uploadResult = await s3.uploadFile(file, key);

  //  STEP 4: Save in DB
  const newFile = await repo.createBlob(
    hash,
    file.originalname,
    file.size,
    uploadResult.Location
  );

  //  STEP 5: Save in Redis
  await redis.set(hash, JSON.stringify(newFile.rows[0]));

  return {
    message: "Uploaded to S3",
    reused: false,
    file: newFile.rows[0]
  };
};