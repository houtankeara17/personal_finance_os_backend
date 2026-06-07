const mongoose = require("mongoose");

/**
 * Saving — money you keep/allocate for yourself (emergency fund, investments, etc.)
 * Also DEDUCTED from net spendable in dashboard calculations
 * Unlike Remittance, this money stays with you — it's an internal allocation
 * No image needed: this is a bookkeeping entry, not a physical transfer
 *
 * Money Flow:
 *   Net Spendable = Salary + Bonus - Remittance - Saving
 *   Remaining     = Net Spendable - Total Expenses (this month)
 */
const savingSchema = new mongoose.Schema(
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

    // --- Category ---
    category: {
      type: String,
      required: true,
      enum: [
        "Emergency Pool",
        "Investment",
        "General Savings",
        "Education",
        "Travel Fund",
        "Other",
      ],
    },

    // --- Period ---
    year: { type: Number, required: true },
    monthNumber: { type: Number, required: true, min: 1, max: 12 },

    noted: { type: String, default: "" },
    // No image — internal allocation, no physical receipt
  },
  { timestamps: true },
);

savingSchema.index({ userId: 1, year: 1, monthNumber: 1 });
savingSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model("Saving", savingSchema);
