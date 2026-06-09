const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getSalaries,
  getSalary,
  createSalary,
  updateSalary,
  deleteSalary,
} = require("../controllers/salaryController");

// All routes protected
router.use(protect);

// ⭐️ Your base route here already handles queries like ?year=2026&monthNumber=3
router.route("/").get(getSalaries).post(createSalary);

router.route("/:id").get(getSalary).put(updateSalary).delete(deleteSalary);

module.exports = router;
