const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const repo = require("../repositories/userRepository");

const SECRET = "mysecret"; // later move to .env

exports.register = async (email, password) => {
  const existing = await repo.findByEmail(email);

  if (existing.rows.length > 0) {
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await repo.createUser(email, hashed);

  return {
    id: user.rows[0].id,
    email: user.rows[0].email
  };
};

exports.login = async (email, password) => {

  const user = await repo.findByEmail(email);

  if (user.rows.length === 0) {
    throw new Error("User not found");
  }

  const valid = await bcrypt.compare(password, user.rows[0].password);

  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    { id: user.rows[0].id, email: user.rows[0].email },
    SECRET,
    { expiresIn: "1h" }
  );

  return token;
};