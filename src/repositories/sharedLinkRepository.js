const db = require("../config/db");

exports.createSharedLink = async ({ fileRefId, token, isPublic, passwordHash, expiresAt }) => {
  const result = await db.query(
    `INSERT INTO shared_links(file_ref_id, token, is_public, password_hash, expires_at)
     VALUES($1, $2, $3, $4, $5) RETURNING *`,
    [fileRefId, token, isPublic, passwordHash || null, expiresAt || null]
  );
  return result.rows[0];
};

exports.findByToken = async (token) => {
  const result = await db.query(
    `SELECT sl.*, fr.user_id, fr.display_name, fb.s3_key, fb.mime_type, fb.size_bytes
     FROM shared_links sl
     JOIN file_references fr ON fr.id = sl.file_ref_id
     JOIN file_blobs fb ON fb.id = fr.blob_id
     WHERE sl.token = $1`,
    [token]
  );
  return result.rows[0] || null;
};

exports.findByFileRefId = async (fileRefId) => {
  const result = await db.query(
    "SELECT * FROM shared_links WHERE file_ref_id = $1",
    [fileRefId]
  );
  return result.rows;
};

exports.incrementDownloadCount = async (token) => {
  await db.query(
    "UPDATE shared_links SET download_count = download_count + 1 WHERE token = $1",
    [token]
  );
};

exports.deleteByToken = async (token) => {
  await db.query("DELETE FROM shared_links WHERE token = $1", [token]);
};

exports.deleteById = async (id) => {
  await db.query("DELETE FROM shared_links WHERE id = $1", [id]);
};
