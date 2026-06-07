const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getExchangeLogs,
  getExchangeLog,
  createExchangeLog,
  updateExchangeLog,
  deleteExchangeLog,
  getVolumeAnalytics,
} = require("../controllers/exchangeLogController");

router.use(protect);

// Analytics before /:id
router.get("/analytics/volume", getVolumeAnalytics);

router.route("/").get(getExchangeLogs).post(createExchangeLog);

router
  .route("/:id")
  .get(getExchangeLog)
  .put(updateExchangeLog)
  .delete(deleteExchangeLog);

module.exports = router;
