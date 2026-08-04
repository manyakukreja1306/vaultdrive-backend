const express = require("express");
const router = express.Router();
const analyticsService = require("../services/analyticsService");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { asyncHandler } = require("../middleware/errorHandler");

// Per-user analytics (authenticated)
router.get("/me", auth, asyncHandler(async (req, res) => {
  const stats = await analyticsService.getUserAnalytics(req.user.id);
  if (!stats) return res.status(404).json({ message: "No analytics found for user" });
  res.json(stats);
}));

// Global analytics (admin only)
router.get("/global", auth, authorize("ADMIN"), asyncHandler(async (req, res) => {
  const stats = await analyticsService.getGlobalAnalytics();
  res.json(stats);
}));

module.exports = router;