const db = require("../config/db");

exports.findByEmail = async (email) => {
  const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] || null;
};

exports.findById = async (id) => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
};

exports.updateStorageUsed = async (userId, newStorageUsed) => {
  await db.query("UPDATE users SET storage_used = $1 WHERE id = $2", [newStorageUsed, userId]);
};