const mongoose = require("mongoose");

/**
 * Salary — monthly base pay per employee/user
 * One record per month per user (enforced by unique index)
 * Deducted from net spendable in dashboard calculations
 */
const salarySchema = new mongoose.Schema(
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
    amountUSD: { type: Number, required: true }, // normalized for calculations

    // --- Period ---
    year: { type: Number, required: true },
    month: { type: String, required: true }, // e.g. "January"
    monthNumber: { type: Number, required: true, min: 1, max: 12 },

    // --- Status ---
    status: {
      type: String,
      enum: ["Draft", "Confirmed", "Disbursed"],
      default: "Confirmed",
    },

    // --- Proof / Receipt ---
    // Single image: payslip or bank transfer screenshot
    image: { type: String, default: "" }, // URL from cloud storage

    noted: { type: String, default: "" },
  },
  { timestamps: true },
);

// One salary record per user per month per year
salarySchema.index({ userId: 1, year: 1, monthNumber: 1 }, { unique: true });

module.exports = mongoose.model("Salary", salarySchema);
