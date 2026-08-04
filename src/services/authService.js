const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");
const { redis, REDIS_PREFIXES, TTL } = require("../config/redis");

const SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRY_MS = parseInt(process.env.ACCESS_TOKEN_EXPIRY) || 900000;
const REFRESH_EXPIRY_MS = parseInt(process.env.REFRESH_TOKEN_EXPIRY) || 604800000;

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.email, userId: user.id, role: user.role },
    SECRET,
    { expiresIn: Math.floor(ACCESS_EXPIRY_MS / 1000) }
  );
}

function generateRefreshToken(email) {
  return jwt.sign(
    { sub: email, type: "refresh" },
    SECRET,
    { expiresIn: Math.floor(REFRESH_EXPIRY_MS / 1000) }
  );
}

exports.register = async (email, password, displayName) => {
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    const err = new Error("Email already in use");
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users(email, password_hash, display_name)
     VALUES($1, $2, $3) RETURNING id, email, display_name, role`,
    [email, passwordHash, displayName]
  );

  const user = result.rows[0];
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.email);

  await redis.set(
    REDIS_PREFIXES.refresh + user.email,
    refreshToken,
    "EX",
    TTL.REFRESH_TOKEN
  );

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
  };
};

exports.login = async (email, password) => {
  const result = await db.query(
    "SELECT id, email, display_name, role, password_hash, is_active FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  const user = result.rows[0];

  if (!user.is_active) {
    const err = new Error("Account is deactivated");
    err.statusCode = 400;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.email);

  await redis.set(
    REDIS_PREFIXES.refresh + user.email,
    refreshToken,
    "EX",
    TTL.REFRESH_TOKEN
  );

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
  };
};

exports.refreshToken = async (incomingRefreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, SECRET);
  } catch (e) {
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    throw err;
  }

  const email = decoded.sub;
  const stored = await redis.get(REDIS_PREFIXES.refresh + email);

  if (!stored || stored !== incomingRefreshToken) {
    const err = new Error("Refresh token revoked or mismatch");
    err.statusCode = 401;
    throw err;
  }

  const result = await db.query(
    "SELECT id, email, display_name, role FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }

  const user = result.rows[0];
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user.email);

  await redis.set(
    REDIS_PREFIXES.refresh + user.email,
    newRefreshToken,
    "EX",
    TTL.REFRESH_TOKEN
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    tokenType: "Bearer",
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
  };
};

exports.logout = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, SECRET);
  } catch (e) {
    return; // already invalid, nothing to revoke
  }
  await redis.del(REDIS_PREFIXES.refresh + decoded.sub);
};