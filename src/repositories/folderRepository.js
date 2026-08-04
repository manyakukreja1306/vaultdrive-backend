const db = require("../config/db");

exports.createFolder = async ({ userId, name, parentId }) => {
  const result = await db.query(
    `INSERT INTO folders(user_id, name, parent_id)
     VALUES($1, $2, $3) RETURNING *`,
    [userId, name, parentId || null]
  );
  return result.rows[0];
};

exports.findFoldersByUser = async (userId, parentId) => {
  const parentCondition = parentId ? "AND parent_id = $2" : "AND parent_id IS NULL";
  const params = parentId ? [userId, parentId] : [userId];
  const result = await db.query(
    `SELECT * FROM folders WHERE user_id = $1 ${parentCondition} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
};

exports.findFolderById = async (id) => {
  const result = await db.query("SELECT * FROM folders WHERE id = $1", [id]);
  return result.rows[0] || null;
};

exports.updateFolder = async (id, name) => {
  const result = await db.query(
    "UPDATE folders SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [name, id]
  );
  return result.rows[0];
};

exports.deleteFolder = async (id) => {
  await db.query("DELETE FROM folders WHERE id = $1", [id]);
};
