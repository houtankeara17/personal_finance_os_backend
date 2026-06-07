// ============================================================
//  routes/auth.js
// ============================================================
const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Existing standard authentication endpoints
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);
// 2. DEFINE THE NEW ENDPOINTS HERE! 👇
router.post("/forgot-password", forgotPassword); // <-- Add this route
router.put("/reset-password", resetPassword);

// ─── 1. Kickstart Google Auth Flow ──────────────────────────────────────
// Triggers the window shift to Google's authentication server screen
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// ─── 2. Handle Google Callback Redirection ──────────────────────────────
// This is the endpoint Google hits after the user accepts permissions
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_failed`,
    session: false,
  }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_failed`,
        );
      }

      // Generate a payload token identically matched to your controller's sign-in matrix
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Bounce execution focus down cleanly into your frontend OAuth handler page
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-callback?token=${token}`,
      );
    } catch (error) {
      console.error("OAuth callback packaging error:", error);
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_failed`,
      );
    }
  },
);

module.exports = router;
