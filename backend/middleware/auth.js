const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect - verifies the JWT sent in the Authorization header
 * (format: "Bearer <token>") and attaches the authenticated user to req.user.
 */
exports.protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized, invalid token" });
  }
};

/**
 * authorize(...roles) - restricts a route to specific user roles.
 * Usage: router.patch("/:id/status", protect, authorize("admin"), handler)
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user ? req.user.role : "unknown"}' is not permitted to perform this action`,
      });
    }
    next();
  };
};
