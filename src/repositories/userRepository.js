const db = require("../config/db");

exports.createUser = async (email, password) => {
  return db.query(
    "INSERT INTO users(email, password) VALUES($1,$2) RETURNING *",
    [email, password]
  );
};

exports.findByEmail = async (email) => {
  return db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
};