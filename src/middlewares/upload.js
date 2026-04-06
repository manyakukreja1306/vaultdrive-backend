const multer = require("multer");

// store file in memory (important for later hashing + S3)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
});

module.exports = upload;