const express = require("express");
const router = express.Router();
const folderService = require("../services/folderService");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { asyncHandler } = require("../middleware/errorHandler");
const { createFolderSchema } = require("../dto/request/fileSchemas");

// Create folder
router.post("/", auth, validate(createFolderSchema), asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const folder = await folderService.createFolder(req.user.id, name, parentId);
  res.status(201).json(folder);
}));

// List folders
router.get("/", auth, asyncHandler(async (req, res) => {
  const { parentId } = req.query;
  const folders = await folderService.listFolders(req.user.id, parentId);
  res.json(folders);
}));

// Update folder
router.patch("/:id", auth, asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "name is required" });
  const folder = await folderService.updateFolder(req.user.id, req.params.id, name);
  res.json(folder);
}));

// Delete folder
router.delete("/:id", auth, asyncHandler(async (req, res) => {
  await folderService.deleteFolder(req.user.id, req.params.id);
  res.status(204).send();
}));

module.exports = router;
