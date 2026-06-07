const mongoose = require("mongoose");

/**
 * Remittance — money sent out to family members or others (e.g. giving mom $200/month)
 * This is DEDUCTED from net spendable in dashboard calculations
 * Think of it as: Salary - Remittance - Saving = What you can actually spend
 *
 * Name reasoning:
 *   "Remittance" = money transferred/sent to another person, especially family
 *   More precise than "Transfer" which is too generic (could mean bank-to-bank)
 *   More honest than "Family Allowance" since recipients can be anyone
 */
const remittanceSchema = new mongoose.Schema(
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

    // --- Recipient ---
    recipient: { type: String, required: true, trim: true }, // e.g. "Mom", "Brother", "Dad"
    recipientRelation: {
      type: String,
      enum: [
        "Mother",
        "Father",
        "Sibling",
        "Spouse",
        "Child",
        "Relative",
        "Friend",
        "Other",
      ],
      default: "Other",
    },

    // --- Transfer Method ---
    method: {
      type: String,
      required: true,
      enum: [
        "Cash",
        "ABA Bank",
        "ACLYDA Bank",
        "Wing",
        "Bank Transfer",
        "Other",
      ],
    },

    // --- Period ---
    remittanceDate: { type: Date, required: true, default: Date.now },
    year: { type: Number, required: true },
    monthNumber: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 },

    // --- Proof ---
    // Single image: transfer confirmation, Wing receipt, bank slip
    image: { type: String, default: "" }, // URL from cloud storage

    noted: { type: String, default: "" },
  },
  { timestamps: true },
);

remittanceSchema.index({ userId: 1, year: 1, monthNumber: 1 });
remittanceSchema.index({ userId: 1, recipient: 1 });

module.exports = mongoose.model("Remittance", remittanceSchema);
