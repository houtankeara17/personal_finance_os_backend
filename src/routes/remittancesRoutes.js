const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getRemittances,
  getRemittance,
  createRemittance,
  updateRemittance,
  deleteRemittance,
} = require("../controllers/remittanceController");

router.use(protect);

router.route("/").get(getRemittances).post(createRemittance);

router
  .route("/:id")
  .get(getRemittance)
  .put(updateRemittance)
  .delete(deleteRemittance);

module.exports = router;
