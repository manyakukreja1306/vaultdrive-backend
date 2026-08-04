const AppError = require("./AppError");
class StorageLimitException extends AppError {
  constructor(storageUsed, storageLimit, fileSize) {
    super("Storage limit exceeded", 413, "STORAGE_LIMIT_EXCEEDED");
    this.storageUsed = storageUsed;
    this.storageLimit = storageLimit;
    this.fileSize = fileSize;
  }
}
module.exports = StorageLimitException;
