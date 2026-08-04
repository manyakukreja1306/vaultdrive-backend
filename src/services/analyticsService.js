const db = require("../config/db");
const { redis, REDIS_PREFIXES, TTL } = require("../config/redis");

/**
 * Per-user analytics from storage_savings_per_user view.
 */
exports.getUserAnalytics = async (userId) => {
  const cacheKey = `${REDIS_PREFIXES.analytics}user:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await db.query(
    `SELECT
       user_id,
       email,
       total_bytes_saved,
       dedup_count,
       storage_used,
       storage_limit,
       dedup_rate_pct,
       CASE
         WHEN storage_limit = 0 THEN 0
         ELSE ROUND(storage_used::NUMERIC / storage_limit * 100, 2)
       END AS storage_used_pct
     FROM storage_savings_per_user
     WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const analytics = {
    userId: row.user_id,
    email: row.email,
    totalBytesSaved: parseInt(row.total_bytes_saved),
    dedupCount: parseInt(row.dedup_count),
    storageUsed: parseInt(row.storage_used),
    storageLimit: parseInt(row.storage_limit),
    dedupRatePercent: parseFloat(row.dedup_rate_pct),
    storageUsedPercent: parseFloat(row.storage_used_pct),
  };

  await redis.set(cacheKey, JSON.stringify(analytics), "EX", TTL.ANALYTICS);
  return analytics;
};

/**
 * Global analytics for admin — uses calculate_global_savings stored procedure.
 */
exports.getGlobalAnalytics = async () => {
  const cacheKey = `${REDIS_PREFIXES.analytics}global`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await db.query("SELECT * FROM calculate_global_savings()");
  const row = result.rows[0];

  const analytics = {
    totalUniqueBlobs: parseInt(row.total_unique_blobs),
    totalReferences: parseInt(row.total_references),
    totalBytesSavedGlobally: parseInt(row.total_bytes_saved_globally),
    globalDedupRatePct: parseFloat(row.global_dedup_rate_pct),
    totalS3StorageBytes: parseInt(row.total_s3_storage_bytes),
  };

  await redis.set(cacheKey, JSON.stringify(analytics), "EX", TTL.ANALYTICS);
  return analytics;
};