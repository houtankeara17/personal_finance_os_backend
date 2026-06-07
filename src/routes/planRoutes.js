const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  addFunding,
  deletePlan,
  deleteAllPlans,
} = require("../controllers/planController");

router.use(protect);

// Special actions — before /:id
router.patch("/:id/fund", addFunding); // inject funding
router.delete("/all", deleteAllPlans); // delete all plans at once

router.route("/").get(getPlans).post(createPlan);

router.route("/:id").get(getPlan).put(updatePlan).delete(deletePlan);

module.exports = router;
