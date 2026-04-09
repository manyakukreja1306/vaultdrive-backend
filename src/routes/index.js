const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const fileRoutes = require("./fileRoutes");
const analyticsRoutes = require("./analyticsRoutes");

router.use("/auth", authRoutes);
router.use("/files", fileRoutes);
router.use("/analytics", analyticsRoutes);

module.exports = router;