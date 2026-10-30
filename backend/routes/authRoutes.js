
const express = require("express");
const router = express.Router();
const { register, login, setupMfa, verifyMfaSetup } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/mfa/setup", protect, setupMfa);
router.post("/mfa/verify-setup", protect, verifyMfaSetup);

module.exports = router;
