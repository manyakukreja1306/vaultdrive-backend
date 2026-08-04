const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const fileService = require("../services/fileService");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5368709120 },
});

// Upload
router.post("/upload", auth, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const folderId = req.query.folderId || req.body.folderId || null;
  const result = await fileService.uploadFile({
    fileBuffer: req.file.buffer,
    originalFile: req.file,
    userId: req.user.id,
    folderId,
  });
  res.status(201).json(result);
}));

// List files
router.get("/", auth, asyncHandler(async (req, res) => {
  const { folderId, page = 1, size = 20 } = req.query;
  const result = await fileService.listFiles(req.user.id, folderId, parseInt(page), parseInt(size));
  res.json(result);
}));

// Search
router.get("/search", auth, asyncHandler(async (req, res) => {
  const { q, page = 1, size = 20 } = req.query;
  const result = await fileService.searchFiles(req.user.id, q || "", parseInt(page), parseInt(size));
  res.json(result);
}));

// Starred
router.get("/starred", auth, asyncHandler(async (req, res) => {
  const result = await fileService.listStarred(req.user.id);
  res.json(result);
}));

// Trash
router.get("/trash", auth, asyncHandler(async (req, res) => {
  const result = await fileService.listTrashed(req.user.id);
  res.json(result);
}));

// Download URL
router.get("/:id/download", auth, asyncHandler(async (req, res) => {
  const url = await fileService.generateDownloadUrl(req.params.id, req.user.id);
  res.json({ url });
}));

// Soft delete (move to trash)
router.delete("/:id", auth, asyncHandler(async (req, res) => {
  await fileService.deleteFile(req.params.id, req.user.id);
  res.status(204).send();
}));

// Restore from trash
router.post("/:id/restore", auth, asyncHandler(async (req, res) => {
  await fileService.restoreFile(req.params.id, req.user.id);
  res.json({ message: "File restored" });
}));

// Permanent delete
router.delete("/:id/permanent", auth, asyncHandler(async (req, res) => {
  await fileService.permanentlyDeleteFile(req.params.id, req.user.id);
  res.status(204).send();
}));

// Star
router.post("/:id/star", auth, asyncHandler(async (req, res) => {
  await fileService.starFile(req.params.id, req.user.id);
  res.json({ message: "File starred" });
}));

// Unstar
router.delete("/:id/star", auth, asyncHandler(async (req, res) => {
  await fileService.unstarFile(req.params.id, req.user.id);
  res.json({ message: "File unstarred" });
}));

module.exports = router;