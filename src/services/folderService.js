const folderRepo = require("../repositories/folderRepository");
const { redis, REDIS_PREFIXES, TTL } = require("../config/redis");

exports.createFolder = async (userId, name, parentId) => {
  if (parentId) {
    const parent = await folderRepo.findFolderById(parentId);
    if (!parent || parent.user_id !== userId) {
      const err = new Error("Parent folder not found or access denied");
      err.statusCode = 404;
      throw err;
    }
  }

  const folder = await folderRepo.createFolder({ userId, name, parentId });

  // Invalidate folder tree cache
  await redis.del(`${REDIS_PREFIXES.folders}${userId}`);

  return folder;
};

exports.listFolders = async (userId, parentId) => {
  const cacheKey = `${REDIS_PREFIXES.folders}${userId}:${parentId || "root"}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const folders = await folderRepo.findFoldersByUser(userId, parentId);
  await redis.set(cacheKey, JSON.stringify(folders), "EX", TTL.FOLDER_TREE);
  return folders;
};

exports.updateFolder = async (userId, folderId, name) => {
  const folder = await folderRepo.findFolderById(folderId);
  if (!folder) {
    const err = new Error("Folder not found");
    err.statusCode = 404;
    throw err;
  }
  if (folder.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }

  const updated = await folderRepo.updateFolder(folderId, name);

  // Invalidate folder tree cache
  await redis.del(`${REDIS_PREFIXES.folders}${userId}`);

  return updated;
};

exports.deleteFolder = async (userId, folderId) => {
  const folder = await folderRepo.findFolderById(folderId);
  if (!folder) {
    const err = new Error("Folder not found");
    err.statusCode = 404;
    throw err;
  }
  if (folder.user_id !== userId) {
    const err = new Error("Access denied");
    err.statusCode = 403;
    throw err;
  }

  await folderRepo.deleteFolder(folderId);

  // Invalidate folder tree cache
  await redis.del(`${REDIS_PREFIXES.folders}${userId}`);
};
