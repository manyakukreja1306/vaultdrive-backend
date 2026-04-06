const db = require("../config/db");

exports.findByHash = async (hash) => {
  return db.query(
    "SELECT * FROM file_blobs WHERE hash = $1",
    [hash]
  );
};

exports.createBlob = async (hash, filename, size, url) => {
  return db.query(
    "INSERT INTO file_blobs(hash, filename, size, url) VALUES($1,$2,$3,$4) RETURNING *",
    [hash, filename, size, url]
  );
};