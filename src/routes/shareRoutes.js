const express = require("express");
const router = express.Router();
const shareService = require("../services/shareService");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { asyncHandler } = require("../middleware/errorHandler");
const { createShareLinkSchema } = require("../dto/request/fileSchemas");

// Create a share link (authenticated)
router.post("/", auth, validate(createShareLinkSchema), asyncHandler(async (req, res) => {
  const { fileReferenceId, expiresAt, password, isPublic } = req.body;
  const link = await shareService.createShareLink({
    fileReferenceId,
    userId: req.user.id,
    expiresAt,
    password,
    isPublic,
  });
  res.status(201).json(link);
}));

// List share links for a file reference (authenticated)
router.get("/file/:fileRefId", auth, asyncHandler(async (req, res) => {
  const links = await shareService.listShareLinks(req.params.fileRefId, req.user.id);
  res.json(links);
}));

// Delete a share link (authenticated)
router.delete("/:token", auth, asyncHandler(async (req, res) => {
  await shareService.deleteShareLink(req.params.token, req.user.id);
  res.status(204).send();
}));

module.exports = router;
