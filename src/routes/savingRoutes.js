const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getSavings,
  getSaving,
  createSaving,
  updateSaving,
  deleteSaving,
} = require("../controllers/savingController");

router.use(protect);

router.route("/").get(getSavings).post(createSaving);

router.route("/:id").get(getSaving).put(updateSaving).delete(deleteSaving);

module.exports = router;
