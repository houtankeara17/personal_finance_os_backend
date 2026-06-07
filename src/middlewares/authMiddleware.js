const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  // ─── BYPASS CORS PREFLIGHT OPTIONS REQUESTS ───────────────────────────
  // Browsers send an OPTIONS request before custom header calls (like Bearer tokens).
  // We must pass this through to allow the global CORS middleware to respond.
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Token invalid or expired" });
  }
};

module.exports = { protect };
