const AppError = require("../exceptions/AppError");
const StorageLimitException = require("../exceptions/StorageLimitException");

const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;

  if (err instanceof StorageLimitException) {
    return res.status(413).json({
      status: 413,
      error: "Payload Too Large",
      message: err.message,
      storageUsed: err.storageUsed,
      storageLimit: err.storageLimit,
      fileSize: err.fileSize,
      timestamp,
      path,
    });
  }

  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      error: err.errorCode,
      message: err.message,
      timestamp,
      path,
    });
  }

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: "File size exceeds the allowed limit",
      timestamp,
      path,
    });
  }

  // Joi validation errors
  if (err.isJoi) {
    const errors = {};
    err.details.forEach((d) => {
      errors[d.path.join(".")] = d.message;
    });
    return res.status(400).json({
      status: 400,
      error: "Validation Error",
      message: "Request validation failed",
      errors,
      timestamp,
      path,
    });
  }

  // Catch-all
  console.error("Unhandled error:", err);
  return res.status(500).json({
    status: 500,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
    timestamp,
    path,
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
