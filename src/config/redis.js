const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.connect().catch((err) => {
  console.error("Redis initial connect failed:", err.message);
});

const REDIS_PREFIXES = {
  refresh: "vaultdrive:refresh:",
  analytics: "vaultdrive:analytics:",
  files: "vaultdrive:files:",
  folders: "vaultdrive:folder-tree:",
};

const TTL = {
  FILE_LISTINGS: 300,
  ANALYTICS: 600,
  FOLDER_TREE: 300,
  REFRESH_TOKEN: 604800,
};

module.exports = { redis, REDIS_PREFIXES, TTL };