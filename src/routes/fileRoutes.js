const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const fileService = require("../services/fileService");

router.post("/upload", upload.single("file"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await fileService.uploadFile(req.file);

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;