const db = require("../config/db");
const redis = require("../config/redis");

exports.getStats = async () => {

  const cached = await redis.get("stats");

  if (cached) {
    return JSON.parse(cached);
  }

  const result = await db.query(`
    SELECT 
      COUNT(*) as total_files,
      SUM(size) as total_size
    FROM file_blobs
  `);

  const stats = result.rows[0];

  await redis.set("stats", JSON.stringify(stats), "EX", 300);

  return stats;
};