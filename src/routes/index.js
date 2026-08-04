const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const fileRoutes = require("./fileRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const folderRoutes = require("./folderRoutes");

router.use("/auth", authRoutes);
router.use("/files", fileRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/folders", folderRoutes);

module.exports = router;