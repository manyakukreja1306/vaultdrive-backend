const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const validate = require("../middleware/validate");
const { asyncHandler } = require("../middleware/errorHandler");
const { registerSchema, loginSchema } = require("../dto/request/authSchemas");

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;
  const result = await authService.register(email, password, displayName);
  res.status(201).json(result);
}));

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json(result);
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }
  const result = await authService.refreshToken(refreshToken);
  res.status(200).json(result);
}));

router.post("/logout", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  res.status(204).send();
}));

module.exports = router;