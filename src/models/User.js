const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ─── OAuth fields ─────────────────────────────────────────────────────────
    // password is now optional so OAuth-only users don't need one
    password: { type: String, minlength: 6 },

    // Which providers this account is linked to
    googleId: { type: String, default: null },
    githubId: { type: String, default: null },

    // Tracks how the account was originally created
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    // ─────────────────────────────────────────────────────────────────────────

    avatar: { type: String, default: "" },
    theme: {
      type: String,
      default: "theme-obsidian",
      enum: [
        "theme-obsidian",
        "theme-slate",
        "theme-nord",
        "theme-crimson",
        "theme-violet",
        "theme-amber",
      ],
    },
    currency: { type: String, default: "USD", enum: ["USD", "KHR", "THB"] },
    exchangeRateKhr: { type: Number, default: 4100 },
    exchangeRateThb: { type: Number, default: 36.5 },
    // Inside your User.js Schema declaration file
    resetPasswordToken: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

// ─── Pre-save: only hash if password was set/modified ────────────────────────
// OAuth users may never have a password, so we guard carefully.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance methods (unchanged) ────────────────────────────────────────────
userSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false; // OAuth-only user has no password
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
