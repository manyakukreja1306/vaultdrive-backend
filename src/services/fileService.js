const crypto = require("crypto");
const fileRepo = require("../repositories/fileRepository");
const userRepo = require("../repositories/userRepository");
const s3 = require("../config/s3");
const { redis, REDIS_PREFIXES, TTL } = require("../config/redis");
const StorageLimitException = require("../exceptions/StorageLimitException");
const FileNotFoundException = require("../exceptions/FileNotFoundException");

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/zip", "text/plain",
  "video/mp4", "audio/mpeg",
];

exports.uploadFile = async ({ fileBuffer, originalFile, userId, folderId }) => {
  // 1. Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(originalFile.mimetype)) {
    const err = new Error(`File type ${originalFile.mimetype} is not allowed`);
    err.statusCode = 400;
    throw err;
  }

  // 2. Check storage limit
  const user = await userRepo.findById(userId);
  const fileSize = originalFile.size;

  if (user.storage_used + fileSize > user.storage_limit) {
    throw new StorageLimitException(user.storage_used, user.storage_limit, fileSize);
  }

  // 3. Compute SHA-256 hash
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  // 4. Deduplication check
  const existingBlob = await fileRepo.findBlobByHash(hash);

  let blob;
  let wasDeduplicated = false;
  let bytesSaved = 0;

  if (existingBlob) {
    // DEDUP HIT — do not upload to S3
    wasDeduplicated = true;
    bytesSaved = existingBlob.size_bytes;
    blob = existingBlob;

    // Increment reference_count atomically via stored procedure
    await fileRepo.incrementReferenceCount(blob.id);

    // Record dedup event
    await fileRepo.createDedupEvent({ userId, blobId: blob.id, bytesSaved });

    // Do NOT increment storage_used for the user (dedup = no new bytes stored)
  } else {
    // NEW FILE — upload to S3
    const s3Key = `files/${hash}/${originalFile.originalname}`;
    await s3.uploadFile(fileBuffer, originalFile.mimetype, s3Key);

    // Save blob record
    blob = await fileRepo.createBlob({
      sha256Hash: hash,
      s3Key,
      sizeBytes: fileSize,
      mimeType: originalFile.mimetype,
    });

    // Increment user's storage_used
    await userRepo.updateStorageUsed(userId, user.storage_used + fileSize);
  }

  // 5. Create file reference (always)
  const ref = await fileRepo.createReference({
    userId,
    blobId: blob.id,
    folderId: folderId || null,
    displayName: originalFile.originalname,
  });

  // 6. Invalidate file listing cache for this user
  const cachePattern = `${REDIS_PREFIXES.files}${userId}:*`;
  const keys = await redis.keys(cachePattern);
  if (keys.length > 0) await redis.del(keys);

  return {
    fileReferenceId: ref.id,
    displayName: ref.display_name,
    sizeBytes: blob.size_bytes,
    mimeType: blob.mime_type,
    sha256Hash: blob.sha256_hash,
    wasDeduplicated,
    bytesSaved,
    message: wasDeduplicated
      ? `File deduplicated — saved ${bytesSaved} bytes`
      : "File uploaded successfully",
  };
};

exports.listFiles = async (userId, folderId, page = 1, size = 20) => {
  const cacheKey = `${REDIS_PREFIXES.files}${userId}:${folderId || "root"}:${page}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const rows = await fileRepo.findReferencesByUser(userId, folderId, page, size);
  const result = rows.map(mapToResponse);

  await redis.set(cacheKey, JSON.stringify(result), "EX", TTL.FILE_LISTINGS);
  return result;
};

exports.searchFiles = async (userId, query, page = 1, size = 20) => {
  const rows = await fileRepo.searchByDisplayName(userId, query, page, size);
  return rows.map(mapToResponse);
};

exports.listTrashed = async (userId) => {
  const rows = await fileRepo.findTrashedByUser(userId);
  return rows.map(mapToResponse);
};

exports.listStarred = async (userId) => {
  const rows = await fileRepo.findStarredByUser(userId);
  return rows.map(mapToResponse);
};

exports.deleteFile = async (fileReferenceId, userId) => {
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }
  await fileRepo.softDelete(fileReferenceId);
};

exports.restoreFile = async (fileReferenceId, userId) => {
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }
  await fileRepo.restore(fileReferenceId);
};

exports.permanentlyDeleteFile = async (fileReferenceId, userId) => {
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }

  await fileRepo.hardDelete(fileReferenceId);

  const refCountResult = await fileRepo.decrementReferenceCount(ref.blob_id);

  if (refCountResult && refCountResult.reference_count <= 0) {
    await s3.deleteObject(ref.s3_key);
    await fileRepo.deleteBlobById(ref.blob_id);
  }

  // Update user's storage_used
  const user = await userRepo.findById(userId);
  const newStorage = Math.max(0, user.storage_used - ref.size_bytes);
  await userRepo.updateStorageUsed(userId, newStorage);
};

exports.starFile = async (fileReferenceId, userId) => {
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }
  await fileRepo.setStarred(fileReferenceId, true);
};

exports.unstarFile = async (fileReferenceId, userId) => {
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }
  await fileRepo.setStarred(fileReferenceId, false);
};

exports.generateDownloadUrl = async (fileReferenceId, userId) => {
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }
  return s3.generatePresignedUrl(ref.s3_key, 900);
};

function mapToResponse(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256Hash: row.sha256_hash,
    uploadedAt: row.uploaded_at,
    isStarred: row.is_starred,
    isTrashed: row.is_trashed,
    folderId: row.folder_id,
  };
}