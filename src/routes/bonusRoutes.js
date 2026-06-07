const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getBonuses,
  getBonus,
  createBonus,
  updateBonus,
  deleteBonus,
} = require("../controllers/bonusController");

router.use(protect);

router.route("/").get(getBonuses).post(createBonus);

router.route("/:id").get(getBonus).put(updateBonus).delete(deleteBonus);

module.exports = router;
