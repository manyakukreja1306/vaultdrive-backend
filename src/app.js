require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./routes/index");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — general API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too Many Requests",
    message: "Too many requests from this IP, please try again later.",
  },
});

// Rate limiting — auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too Many Requests",
    message: "Too many authentication attempts, please try again later.",
  },
});

app.get("/", (req, res) => res.json({ status: "VaultDrive API Running" }));
app.get("/health", (req, res) => res.json({ status: "OK" }));

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", routes);

app.use(errorHandler);

module.exports = app;