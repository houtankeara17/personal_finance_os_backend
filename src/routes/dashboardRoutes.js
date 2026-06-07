const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getDashboard,
  getYearlySummary,
} = require("../controllers/dashboardController");

router.use(protect);

router.get("/", getDashboard); // ?year=2025&monthNumber=6
router.get("/yearly", getYearlySummary); // ?year=2025

module.exports = router;
