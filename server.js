require("dotenv").config();

const express = require("express");
const app = express();

const fileRoutes = require("./src/routes/fileRoutes");
const authRoutes = require("./src/routes/authRoutes"); // restored
const analyticsRoutes = require("./src/routes/analyticsRoutes");

app.use(express.json());

app.use("/api/files", fileRoutes);
app.use("/api/auth", authRoutes); // restored
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.send("VaultDrive API Running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});



