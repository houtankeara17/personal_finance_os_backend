const mongoose = require("mongoose");

/**
 * Expense — daily spending records
 * Multiple images allowed: receipts, bills, meal photos
 * Includes day field for daily/weekly breakdown in dashboard
 */
const expenseSchema = new mongoose.Schema(
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

    // --- Category & Payment ---
    category: {
      type: String,
      required: true,
      enum: [
        "Food",
        "Rent",
        "Utilities",
        "Family",
        "Daily",
        "Transport",
        "Health",
        "Entertainment",
        "Other",
      ],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "ABA Bank", "ACLYDA Bank", "Credit Card", "Wing", "Other"],
    },

    // --- Period (full date breakdown for filtering) ---
    expenseDate: { type: Date, required: true, default: Date.now },
    year: { type: Number, required: true },
    monthNumber: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 }, // day of month
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sun, 6=Sat — for weekly pattern chart

    // --- Receipts / Proof ---
    // Multiple images: one bill may have front + back, or multiple items in one purchase
    images: [{ type: String }], // array of URLs from cloud storage

    noted: { type: String, default: "" },
  },
  { timestamps: true },
);

// Compound indexes for dashboard aggregation queries
expenseSchema.index({ userId: 1, year: 1, monthNumber: 1 });
expenseSchema.index({ userId: 1, year: 1, monthNumber: 1, day: 1 });
expenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
