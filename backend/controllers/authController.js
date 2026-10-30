
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const QRCode = require("qrcode");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, role: "citizen" });
    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: "Registration failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password +mfaSecret");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.mfaEnabled) {
      if (!/^\d{6}$/.test(String(totpToken || ""))) {
        return res.status(401).json({
          success: false,
          mfaRequired: true,
          message: "A six-digit authenticator code is required",
        });
      }

      const { verify } = await import("otplib");
      const result = await verify({ secret: user.mfaSecret, token: String(totpToken) });

      if (!result.valid) {
        return res.status(401).json({
          success: false,
          mfaRequired: true,
          message: "Invalid authenticator code",
        });
      }
    }

    const token = signToken(user);

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed", error: err.message });
  }
};

exports.setupMfa = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+mfaSecret");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ success: false, message: "MFA is already enabled" });
    }

    const { generateSecret, generateURI } = await import("otplib");
    const secret = generateSecret();
    const uri = generateURI({
      issuer: "CivicFix",
      label: user.email,
      secret,
    });

    user.mfaSecret = secret;
    await user.save();

    const qrCode = await QRCode.toDataURL(uri);

    res.status(200).json({
      success: true,
      message: "Scan the QR code and verify a code to enable MFA",
      qrCode,
      secret,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "MFA setup failed", error: err.message });
  }
};

exports.verifyMfaSetup = async (req, res) => {
  try {
    const { totpToken } = req.body;

    if (!/^\d{6}$/.test(String(totpToken || ""))) {
      return res.status(400).json({ success: false, message: "A six-digit authenticator code is required" });
    }

    const user = await User.findById(req.user._id).select("+mfaSecret");

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ success: false, message: "Set up MFA before verifying it" });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ success: false, message: "MFA is already enabled" });
    }

    const { verify } = await import("otplib");
    const result = await verify({ secret: user.mfaSecret, token: String(totpToken) });

    if (!result.valid) {
      return res.status(401).json({ success: false, message: "Invalid authenticator code" });
    }

    user.mfaEnabled = true;
    await user.save();

    res.status(200).json({ success: true, message: "MFA enabled successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "MFA verification failed", error: err.message });
  }
};
