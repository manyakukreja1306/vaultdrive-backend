const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const sharedLinkRepo = require("../repositories/sharedLinkRepository");
const fileRepo = require("../repositories/fileRepository");
const s3 = require("../config/s3");
const FileNotFoundException = require("../exceptions/FileNotFoundException");

exports.createShareLink = async ({ fileReferenceId, userId, expiresAt, password, isPublic }) => {
  // Verify ownership
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }

  const token = uuidv4();
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const link = await sharedLinkRepo.createSharedLink({
    fileRefId: fileReferenceId,
    token,
    isPublic,
    passwordHash,
    expiresAt: expiresAt || null,
  });

  return {
    id: link.id,
    token: link.token,
    shareUrl: `/api/share/${link.token}`,
    isPublic: link.is_public,
    expiresAt: link.expires_at,
    createdAt: link.created_at,
  };
};

exports.resolveShareLink = async (token, password) => {
  const link = await sharedLinkRepo.findByToken(token);

  if (!link) {
    const err = new Error("Share link not found or expired");
    err.statusCode = 404;
    throw err;
  }

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    const err = new Error("Share link has expired");
    err.statusCode = 410;
    throw err;
  }

  // Check password if set
  if (link.password_hash) {
    if (!password) {
      const err = new Error("Password required to access this link");
      err.statusCode = 401;
      throw err;
    }
    const valid = await bcrypt.compare(password, link.password_hash);
    if (!valid) {
      const err = new Error("Invalid password");
      err.statusCode = 401;
      throw err;
    }
  }

  // Generate presigned URL
  const downloadUrl = await s3.generatePresignedUrl(link.s3_key, 900);

  // Increment download count
  await sharedLinkRepo.incrementDownloadCount(token);

  return {
    displayName: link.display_name,
    mimeType: link.mime_type,
    sizeBytes: parseInt(link.size_bytes),
    downloadUrl,
    downloadCount: link.download_count + 1,
  };
};

exports.listShareLinks = async (fileReferenceId, userId) => {
  const ref = await fileRepo.findReferenceById(fileReferenceId);
  if (!ref) throw new FileNotFoundException(fileReferenceId);
  if (ref.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }
  return sharedLinkRepo.findByFileRefId(fileReferenceId);
};

exports.deleteShareLink = async (token, userId) => {
  const link = await sharedLinkRepo.findByToken(token);
  if (!link) {
    const err = new Error("Share link not found");
    err.statusCode = 404;
    throw err;
  }
  if (link.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }
  await sharedLinkRepo.deleteByToken(token);
};
