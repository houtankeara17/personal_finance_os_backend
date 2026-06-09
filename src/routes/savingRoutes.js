const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getSavings,
  getSaving,
  createSaving,
  updateSaving,
  deleteSaving,
  deleteAllSavings,
} = require("../controllers/savingController");

router.use(protect);

router
  .route("/")
  .get(getSavings)
  .post(createSaving)
  .delete(protect, deleteAllSavings);

router
  .route("/:id")
  .get(getSaving)
  .put(updateSaving)
  .delete(protect, deleteSaving);

module.exports = router;
