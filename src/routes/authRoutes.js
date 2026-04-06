const express = require("express");
const router = express.Router();
const authService = require("../services/authService");

router.post("/register", async (req, res) => {
  try {
    const user = await authService.register(
      req.body.email,
      req.body.password
    );

    res.json(user);
  } catch (err) {
    console.log("REGISTER ERROR:", err); // 
    res.status(400).json({ message: err.message || "Register failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const token = await authService.login(
      req.body.email,
      req.body.password
    );

    res.json({ token });
  } catch (err) {
    console.log("LOGIN ERROR:", err); // ADD THIS
    res.status(400).json({ message: err.message || "Login failed" });
  }
});

module.exports = router;