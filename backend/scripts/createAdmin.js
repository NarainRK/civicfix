/**
 * scripts/createAdmin.js
 *
 * SECURITY: This is the ONLY way to create an admin account in CivicFix.
 * The public API (POST /api/auth/register) always forces role "citizen" —
 * there is no request a client can send that results in an admin account.
 *
 * Run this manually, with direct access to the database credentials
 * (e.g. from your own machine, or a one-off Render Shell session),
 * never from a client-facing endpoint.
 *
 * Usage:
 *   node scripts/createAdmin.js "Admin Name" admin@civicfix.com "StrongPassword123"
 *
 * Requires MONGODB_URI to be set (via .env or the shell environment).
 */

require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const [, , name, email, password] = process.argv;

  if (!name || !email || !password) {
    console.error("Usage: node scripts/createAdmin.js \"Admin Name\" admin@example.com \"StrongPassword123\"");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    if (password) existing.password = password; // re-hashed by the pre-save hook
    await existing.save();
    console.log(`Existing user ${email} promoted to admin.`);
  } else {
    await User.create({ name, email, password, role: "admin" });
    console.log(`Admin account created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});
