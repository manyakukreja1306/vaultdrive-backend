const jwt = require("jsonwebtoken");
const db = require("../config/db");

const SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ status: 401, error: "Unauthorized", message: "No token provided" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);

    const result = await db.query(
      "SELECT id, email, role, is_active FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ status: 401, error: "Unauthorized", message: "User not found or inactive" });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ status: 401, error: "Unauthorized", message: "Invalid or expired token" });
  }
};
