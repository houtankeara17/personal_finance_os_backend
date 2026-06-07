const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getCategoryBreakdown,
  getWeeklyPattern,
  getCalendarData,
} = require("../controllers/expenseController");

router.use(protect);

// Analytics — must be declared BEFORE /:id to avoid route conflicts
router.get("/analytics/category", getCategoryBreakdown);
router.get("/analytics/weekly-pattern", getWeeklyPattern);
router.get("/analytics/calendar", getCalendarData);

router.route("/").get(getExpenses).post(createExpense);

router.route("/:id").get(getExpense).put(updateExpense).delete(deleteExpense);

module.exports = router;
