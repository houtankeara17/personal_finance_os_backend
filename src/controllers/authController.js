/**
 * @file authController.js
 * @description Auth controller — existing handlers unchanged, OAuth and Password Reset handlers added at the bottom.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");

// ─── Generate JWT (identical format to your original) ────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// ─── POST /api/auth/register ─────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      success: true,
      data: user,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/login ────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    // Guard: user exists but is OAuth-only (no password set)
    if (user && !user.password) {
      const provider = user.authProvider || "social";
      return res.status(401).json({
        success: false,
        message: `This account was created with ${provider}. Please log in with that provider.`,
      });
    }

    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    res.json({
      success: true,
      data: user,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, missing user token context",
      });
    }

    const { name, avatar, theme, currency, exchangeRateKhr, exchangeRateThb } =
      req.body;

    const updateData = {};

    if (name && name.trim() !== "") updateData.name = name.trim();
    if (theme) updateData.theme = theme;
    if (currency) updateData.currency = currency;
    if (exchangeRateKhr !== undefined)
      updateData.exchangeRateKhr = exchangeRateKhr;
    if (exchangeRateThb !== undefined)
      updateData.exchangeRateThb = exchangeRateThb;

    if (avatar) {
      if (avatar.startsWith("data:image")) {
        if (!cloudinary.config().cloud_name) {
          throw new Error(
            "Cloudinary configuration settings are missing on backend system nodes.",
          );
        }
        const uploadResponse = await cloudinary.uploader.upload(avatar, {
          folder: "user_avatars",
          resource_type: "image",
        });
        updateData.avatar = uploadResponse.secure_url;
      } else {
        updateData.avatar = avatar;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile record not found inside database schema",
      });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error("CRITICAL ERROR inside updateProfile Node:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/auth/password ──────────────────────────────────────────────────
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // Guard: OAuth-only users have no password to update
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses social login and has no password to update.",
      });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── OAuth Callback Handler ───────────────────────────────────────────────────
const oauthCallback = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }

    const token = generateToken(req.user._id);
    res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Generates a short-lived recovery JWT and outputs a mock tracking URL to logs
// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide an email address." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // For development convenience, if user doesn't exist, handle nicely
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account profile matching that email address exists.",
      });
    }

    // Short-lived temporary JWT token valid for 15 minutes
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // Stash the token onto the user node for validation processing later
    user.resetPasswordToken = resetToken;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

    console.log("\n====== 🔑 SYSTEM PASSWORD RESET NODE DISPATCHED ======");
    console.log(`TARGET USER: ${user.email}`);
    console.log(`REDIRECT URL: ${resetUrl}`);
    console.log("=====================================================\n");

    // 👇 ADD THE TOKEN AND URL TO THE RESPONSE HERE SO REACT CAN SEE IT!
    res.status(200).json({
      success: true,
      message: "Recovery token generated successfully.",
      token: resetToken, // Pass token to frontend
      redirectUrl: `/reset-password?token=${resetToken}`, // Pass route path
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/auth/reset-password ───────────────────────────────────────────
// Verifies token context and commits new password fields to database
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Missing reset authentication parameters or target password array structure.",
      });
    }

    // Decode and evaluate validation token signatures
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Look for user that matches the payload ID and still holds this active token
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or already consumed transaction token.",
      });
    }

    // Set new password (triggered hooks will handle schema hashing automatically)
    user.password = password;
    user.resetPasswordToken = undefined; // Destroy token to enforce single-use protection
    await user.save();

    res.status(200).json({
      success: true,
      message: "Credentials successfully updated inside database architecture.",
    });
  } catch (err) {
    console.error("Token translation block drop out:", err);
    return res.status(400).json({
      success: false,
      message: "Link has expired or validation token signature is corrupted.",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  oauthCallback,
  forgotPassword, // Added export
  resetPassword, // Added export
};
