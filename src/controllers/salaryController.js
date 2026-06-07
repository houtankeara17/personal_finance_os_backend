const Salary = require("../models/Salary");

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const buildPeriodFields = (year, monthNumber) => ({
  year: Number(year),
  monthNumber: Number(monthNumber),
  month: MONTH_NAMES[Number(monthNumber) - 1],
});

// ─── GET /api/salaries ───────────────────────────────────────────────────────
// Query: ?year=2025&monthNumber=3&status=Confirmed
const getSalaries = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.monthNumber)
      filter.monthNumber = Number(req.query.monthNumber);
    if (req.query.status) filter.status = req.query.status;

    const salaries = await Salary.find(filter).sort({
      year: -1,
      monthNumber: -1,
    });

    // Summary stats
    const totalEarned = salaries.reduce((s, r) => s + r.amountUSD, 0);
    const monthlyAvg = salaries.length ? totalEarned / salaries.length : 0;
    const highestRecord = salaries.reduce(
      (max, r) => (r.amountUSD > (max?.amountUSD || 0) ? r : max),
      null,
    );

    res.json({
      success: true,
      count: salaries.length,
      stats: {
        totalEarned: +totalEarned.toFixed(2),
        monthlyAvg: +monthlyAvg.toFixed(2),
        highestMonth: highestRecord
          ? {
              month: highestRecord.month,
              year: highestRecord.year,
              amount: highestRecord.amountUSD,
            }
          : null,
      },
      data: salaries,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/salaries/:id ───────────────────────────────────────────────────
const getSalary = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!salary)
      return res
        .status(404)
        .json({ success: false, message: "Salary record not found" });
    res.json({ success: true, data: salary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/salaries ──────────────────────────────────────────────────────
// controllers/salaryController.js

const createSalary = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      year,
      monthNumber,
      status,
      image,
      noted,
    } = req.body;

    // 1. Fallback Auth Check
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing user authentication token.",
      });
    }

    // 2. Safe Auto-Calculation for amountUSD if not sent by frontend
    let finalAmountUSD = Number(amountUSD);
    if (!finalAmountUSD || isNaN(finalAmountUSD)) {
      const parsedAmount = Number(amount) || 0;
      if (currency === "USD") {
        finalAmountUSD = parsedAmount;
      } else if (currency === "KHR") {
        finalAmountUSD = parsedAmount / 4000; // 1 USD ~ 4000 KHR
      } else if (currency === "THB") {
        finalAmountUSD = parsedAmount / 35; // 1 USD ~ 35 THB
      } else {
        finalAmountUSD = parsedAmount;
      }
    }

    // 3. Fallback for buildPeriodFields configuration
    const periodFields =
      typeof buildPeriodFields === "function"
        ? buildPeriodFields(year, monthNumber)
        : { year: Number(year), monthNumber: Number(monthNumber) };

    // 4. Document Creation
    const salary = await Salary.create({
      userId: req.user._id,
      amount: Number(amount),
      currency: currency || "USD",
      amountUSD: finalAmountUSD,
      ...periodFields,
      status: status || "Confirmed",
      image: image || "",
      noted: noted || "",
    });

    res.status(201).json({ success: true, data: salary });
  } catch (err) {
    console.error("Backend Error on createSalary:", err);

    // Duplicate key = already has salary configuration for that month
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Salary for this month already exists",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/salaries/:id ───────────────────────────────────────────────────
const updateSalary = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      year,
      monthNumber,
      status,
      image,
      noted,
    } = req.body;

    const salary = await Salary.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        amount,
        currency,
        amountUSD,
        ...(year && monthNumber ? buildPeriodFields(year, monthNumber) : {}),
        status,
        image,
        noted,
      },
      { new: true, runValidators: true },
    );

    if (!salary)
      return res
        .status(404)
        .json({ success: false, message: "Salary record not found" });
    res.json({ success: true, data: salary });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Salary for this month already exists",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/salaries/:id ────────────────────────────────────────────────
const deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!salary)
      return res
        .status(404)
        .json({ success: false, message: "Salary record not found" });
    res.json({ success: true, message: "Salary record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSalaries,
  getSalary,
  createSalary,
  updateSalary,
  deleteSalary,
};
