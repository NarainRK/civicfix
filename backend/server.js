require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const issueRoutes = require("./routes/issueRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Connect to cloud database (MongoDB Atlas) ---
connectDB();

// --- Health check (useful for cloud platform uptime checks) ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "civicfix-backend", time: new Date() });
});

// --- REST API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT,"0.0.0.0", () => {
  console.log(`CivicFix backend running on port ${PORT}`);
});
