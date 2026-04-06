const express = require("express");
const router = express.Router();
const analyticsService = require("../services/analyticsService");

router.get("/stats", async (req, res) => {
  try {
    const stats = await analyticsService.getStats();
    res.json(stats);
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

module.exports = router;