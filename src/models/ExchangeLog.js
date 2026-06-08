const mongoose = require("mongoose");

/**
 * ExchangeLog — tracks every time you physically exchange currency
 * e.g. "Exchanged 500,000 KHR → 122 USD at ABA Bank on Jan 15"
 * Useful to see: how much you exchanged per day/week/month/year
 * and to track the rates you got vs the official rate
 */
const exchangeLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // --- Exchange Details ---
    fromCurrency: {
      type: String,
      required: true,
      enum: ["USD", "KHR", "THB"],
    },
    fromAmount: { type: Number, required: true, min: 0 },

    toCurrency: {
      type: String,
      required: true,
      enum: ["USD", "KHR", "THB"],
    },
    toAmount: { type: Number, required: true, min: 0 },

    // The rate you actually got (toAmount / fromAmount)
    rateUsed: { type: Number, required: true },

    // Official/reference rate at the time (for comparison)
    officialRate: { type: Number, default: null },

    // --- Provider ---
    provider: {
      type: String,
      required: true,
      enum: [
        "ABA Bank",
        "ACLEDA Bank",
        "Wing",
        "Street Exchange",
        "Airport",
        "Other",
      ],
    },
    providerNote: { type: String, default: "" }, // e.g. branch name, stall location

    // --- Date (full breakdown for filtering by day/week/month/year) ---
    exchangeDate: { type: Date, required: true, default: Date.now },
    year: { type: Number, required: true },
    monthNumber: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sun

    // --- Receipts / Slips ---
    // Multiple images: receipt front, receipt back, bank confirmation
    images: [{ type: String }], // array of URLs from cloud storage

    noted: { type: String, default: "" },
  },
  { timestamps: true },
);

// Indexes for time-based aggregation queries
exchangeLogSchema.index({ userId: 1, year: 1, monthNumber: 1 });
exchangeLogSchema.index({ userId: 1, fromCurrency: 1, toCurrency: 1 });
exchangeLogSchema.index({ userId: 1, provider: 1 });

module.exports = mongoose.model("ExchangeLog", exchangeLogSchema);
