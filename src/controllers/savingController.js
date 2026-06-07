const Saving = require("../models/Saving");

// ─── GET /api/savings ────────────────────────────────────────────────────────
// Query: ?year=2025&monthNumber=3&category=Emergency Pool
const getSavings = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.monthNumber)
      filter.monthNumber = Number(req.query.monthNumber);
    if (req.query.category) filter.category = req.query.category;

    const savings = await Saving.find(filter).sort({
      year: -1,
      monthNumber: -1,
    });

    const totalSaved = savings.reduce((s, r) => s + r.amountUSD, 0);
    const monthlyAvg = savings.length ? totalSaved / savings.length : 0;

    // Totals by category
    const byCategory = savings.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amountUSD;
      return acc;
    }, {});

    res.json({
      success: true,
      count: savings.length,
      stats: {
        totalSaved: +totalSaved.toFixed(2),
        monthlyAvg: +monthlyAvg.toFixed(2),
        byCategory,
      },
      data: savings,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/savings/:id ────────────────────────────────────────────────────
const getSaving = async (req, res) => {
  try {
    const record = await Saving.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Saving record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/savings ───────────────────────────────────────────────────────
const createSaving = async (req, res) => {
  try {
    const { amount, currency, amountUSD, year, monthNumber, category, noted } =
      req.body;

    const record = await Saving.create({
      userId: req.user._id,
      amount,
      currency,
      amountUSD,
      year: Number(year),
      monthNumber: Number(monthNumber),
      category,
      noted: noted || "",
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/savings/:id ────────────────────────────────────────────────────
const updateSaving = async (req, res) => {
  try {
    const { amount, currency, amountUSD, year, monthNumber, category, noted } =
      req.body;

    const record = await Saving.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { amount, currency, amountUSD, year, monthNumber, category, noted },
      { new: true, runValidators: true },
    );

    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Saving record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/savings/:id ─────────────────────────────────────────────────
const deleteSaving = async (req, res) => {
  try {
    const record = await Saving.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Saving record not found" });
    res.json({ success: true, message: "Saving record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSavings,
  getSaving,
  createSaving,
  updateSaving,
  deleteSaving,
};
