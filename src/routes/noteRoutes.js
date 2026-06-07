const express = require("express");
const {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  reorderNotes, // ← add this
} = require("../controllers/noteController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.patch("/reorder", protect, reorderNotes); // ← must be BEFORE /:id routes
router.route("/").get(protect, getNotes).post(protect, createNote);
router.route("/:id").put(protect, updateNote).delete(protect, deleteNote);

module.exports = router;
