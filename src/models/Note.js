const mongoose = require("mongoose");

const noteItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    checked: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },

    // --- New Icon Field ---
    icon: { type: String, default: "Notebook" }, // Stores Lucide icon name string

    categoryTag: {
      type: String,
      default: "General",
      enum: [
        "Personal Finance OS",
        "Work",
        "Personal",
        "Finance",
        "Shopping",
        "Health",
        "Travel",
        "Ideas",
        "General",
      ],
    },

    // --- Image field (Can be Cloudinary URL or an Abstract Gradient Name) ---
    image: { type: String, default: "" },

    color: {
      type: String,
      default: "default",
      enum: ["default", "green", "blue", "yellow", "red", "purple", "orange"],
    },
    pinned: { type: Boolean, default: false },
    items: [noteItemSchema],
    position: { type: Number, default: 0, index: true },
    column: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true },
);

noteSchema.index({ userId: 1, position: 1 });
noteSchema.index({ userId: 1, pinned: -1, position: 1 });

module.exports = mongoose.model("Note", noteSchema);
