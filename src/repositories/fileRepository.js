const db = require("../config/db");

// FileBlob operations
exports.findBlobByHash = async (hash) => {
  const result = await db.query("SELECT * FROM file_blobs WHERE sha256_hash = $1", [hash]);
  return result.rows[0] || null;
};

exports.createBlob = async ({ sha256Hash, s3Key, sizeBytes, mimeType }) => {
  const result = await db.query(
    `INSERT INTO file_blobs(sha256_hash, s3_key, size_bytes, mime_type)
     VALUES($1, $2, $3, $4) RETURNING *`,
    [sha256Hash, s3Key, sizeBytes, mimeType]
  );
  return result.rows[0];
};

exports.incrementReferenceCount = async (blobId) => {
  await db.query("SELECT increment_reference_count($1)", [blobId]);
};

exports.decrementReferenceCount = async (blobId) => {
  const result = await db.query(
    "UPDATE file_blobs SET reference_count = reference_count - 1 WHERE id = $1 RETURNING reference_count",
    [blobId]
  );
  return result.rows[0];
};

exports.deleteBlobById = async (blobId) => {
  await db.query("DELETE FROM file_blobs WHERE id = $1", [blobId]);
};

// FileReference operations
exports.createReference = async ({ userId, blobId, folderId, displayName }) => {
  const result = await db.query(
    `INSERT INTO file_references(user_id, blob_id, folder_id, display_name)
     VALUES($1, $2, $3, $4) RETURNING *`,
    [userId, blobId, folderId || null, displayName]
  );
  return result.rows[0];
};

exports.findReferencesByUser = async (userId, folderId, page, size) => {
  const offset = (page - 1) * size;
  const folderCondition = folderId ? "AND folder_id = $3" : "AND folder_id IS NULL";
  const params = folderId ? [userId, false, folderId, size, offset] : [userId, false, size, offset];
  const query = `
    SELECT fr.*, fb.sha256_hash, fb.s3_key, fb.size_bytes, fb.mime_type
    FROM file_references fr
    JOIN file_blobs fb ON fb.id = fr.blob_id
    WHERE fr.user_id = $1 AND fr.is_trashed = $2
    ${folderCondition}
    ORDER BY fr.uploaded_at DESC
    LIMIT ${folderId ? "$4" : "$3"} OFFSET ${folderId ? "$5" : "$4"}
  `;
  const result = await db.query(query, params);
  return result.rows;
};

exports.findTrashedByUser = async (userId) => {
  const result = await db.query(
    `SELECT fr.*, fb.sha256_hash, fb.s3_key, fb.size_bytes, fb.mime_type
     FROM file_references fr
     JOIN file_blobs fb ON fb.id = fr.blob_id
     WHERE fr.user_id = $1 AND fr.is_trashed = true
     ORDER BY fr.trashed_at DESC`,
    [userId]
  );
  return result.rows;
};

exports.findStarredByUser = async (userId) => {
  const result = await db.query(
    `SELECT fr.*, fb.sha256_hash, fb.s3_key, fb.size_bytes, fb.mime_type
     FROM file_references fr
     JOIN file_blobs fb ON fb.id = fr.blob_id
     WHERE fr.user_id = $1 AND fr.is_starred = true AND fr.is_trashed = false
     ORDER BY fr.uploaded_at DESC`,
    [userId]
  );
  return result.rows;
};

exports.searchByDisplayName = async (userId, query, page, size) => {
  const offset = (page - 1) * size;
  const result = await db.query(
    `SELECT fr.*, fb.sha256_hash, fb.s3_key, fb.size_bytes, fb.mime_type
     FROM file_references fr
     JOIN file_blobs fb ON fb.id = fr.blob_id
     WHERE fr.user_id = $1 AND fr.is_trashed = false
       AND LOWER(fr.display_name) LIKE LOWER($2)
     ORDER BY fr.uploaded_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, `%${query}%`, size, offset]
  );
  return result.rows;
};

exports.findReferenceById = async (id) => {
  const result = await db.query(
    `SELECT fr.*, fb.sha256_hash, fb.s3_key, fb.size_bytes, fb.mime_type
     FROM file_references fr
     JOIN file_blobs fb ON fb.id = fr.blob_id
     WHERE fr.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

exports.softDelete = async (id) => {
  await db.query(
    "UPDATE file_references SET is_trashed = true, trashed_at = NOW() WHERE id = $1",
    [id]
  );
};

exports.restore = async (id) => {
  await db.query(
    "UPDATE file_references SET is_trashed = false, trashed_at = NULL WHERE id = $1",
    [id]
  );
};

exports.hardDelete = async (id) => {
  await db.query("DELETE FROM file_references WHERE id = $1", [id]);
};

exports.setStarred = async (id, starred) => {
  await db.query("UPDATE file_references SET is_starred = $1 WHERE id = $2", [starred, id]);
};

exports.findTrashedBefore = async (cutoffDate) => {
  const result = await db.query(
    "SELECT * FROM file_references WHERE is_trashed = true AND trashed_at < $1",
    [cutoffDate]
  );
  return result.rows;
};

// DedupEvent operations
exports.createDedupEvent = async ({ userId, blobId, bytesSaved }) => {
  const result = await db.query(
    "INSERT INTO dedup_events(user_id, blob_id, bytes_saved) VALUES($1, $2, $3) RETURNING *",
    [userId, blobId, bytesSaved]
  );
  return result.rows[0];
};