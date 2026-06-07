const mongoose = require("mongoose");

/**
 * Plan — financial goals / dream purchases
 * e.g. "Buy a MacBook Pro", "Family vacation to Thailand", "New motorcycle"
 * Multiple images: inspiration photos, progress milestones, final purchase proof
 */
const planSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // --- Goal Amount ---
    targetAmount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      enum: ["USD", "KHR", "THB"],
      default: "USD",
    },
    targetAmountUSD: { type: Number, required: true },

    // --- Current Funding ---
    currentFunding: { type: Number, default: 0, min: 0 }, // in USD for consistency

    // --- Target Date (optional deadline) ---
    targetDate: { type: Date, default: null },

    // --- Status ---
    status: {
      type: String,
      enum: ["Dreaming", "Active Allocation", "Accomplished"],
      default: "Dreaming",
    },

    // --- Priority ---
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    // --- Images ---
    // Multiple images:
    //   - inspiration/mood photos (Dreaming phase)
    //   - progress screenshots (Active phase)
    //   - purchase/achievement proof (Accomplished phase)
    images: [{ type: String }], // array of URLs, first one used as hero/cover

    noted: { type: String, default: "" },
  },
  { timestamps: true },
);

planSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Plan", planSchema);
