const mongoose = require("mongoose");

/**
 * Bonus — special / performance pay, separate from base salary
 * Multiple bonuses allowed per month (no unique constraint on month)
 * Tags categorize the reason for the bonus
 */
const bonusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // --- Amount ---
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      enum: ["USD", "KHR", "THB"],
      default: "USD",
    },
    amountUSD: { type: Number, required: true },

    // --- Period ---
    year: { type: Number, required: true },
    month: { type: String, required: true }, // e.g. "March"
    monthNumber: { type: Number, required: true, min: 1, max: 12 },

    // --- Category Tag ---
    tag: {
      type: String,
      required: true,
      enum: [
        "🏆 Performance",
        "📅 Annual",
        "🎄 Holiday",
        "🚀 Project",
        "🤝 Referral",
        "🎁 Other",
      ],
    },

    // --- Status ---
    status: {
      type: String,
      enum: ["Draft", "Confirmed", "Disbursed"],
      default: "Confirmed",
    },

    // --- Proof / Receipt ---
    // Single image: bonus letter, HR approval, or transfer slip
    image: { type: String, default: "" }, // URL from cloud storage

    noted: { type: String, default: "" },
  },
  { timestamps: true },
);

// Index for efficient queries by user + period
bonusSchema.index({ userId: 1, year: 1, monthNumber: 1 });

module.exports = mongoose.model("Bonus", bonusSchema);
