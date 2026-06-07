// =============================================================================
// ─── EXPENSE CONTROLLERS ─────────────────────────────────────────────────────
// =============================================================================

const Expense = require("../models/Expense");
const cloudinary = require("../config/cloudinary");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ─── HELPER: UPLOAD MULTIPLE IMAGES TO CLOUDINARY ────────────────────────────
const uploadMultipleImages = async (images, folder) => {
  if (!images || !Array.isArray(images) || images.length === 0) return [];
  const results = await Promise.all(
    images.map((img) =>
      cloudinary.uploader.upload(img, { folder, resource_type: "auto" }),
    ),
  );
  return results.map((r) => r.secure_url);
};

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

const getExpenses = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.monthNumber)
      filter.monthNumber = Number(req.query.monthNumber);
    if (req.query.day) filter.day = Number(req.query.day);
    if (req.query.category) filter.category = req.query.category;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ expenseDate: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(filter),
    ]);

    const allForPeriod = await Expense.find(filter);

    const totalSpent = allForPeriod.reduce((s, r) => s + (r.amountUSD || 0), 0);

    const largest = allForPeriod.reduce(
      (max, r) => ((r.amountUSD || 0) > (max?.amountUSD || 0) ? r : max),
      null,
    );
    const avg = allForPeriod.length ? totalSpent / allForPeriod.length : 0;

    const categoryTotals = allForPeriod.reduce((acc, r) => {
      const cat = r.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + (r.amountUSD || 0);
      return acc;
    }, {});
    const topCategory =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || null;

    res.json({
      success: true,
      count: total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      stats: {
        totalSpent: +totalSpent.toFixed(2),
        largest: largest
          ? { amount: largest.amountUSD, category: largest.category }
          : null,
        avgPerItem: +avg.toFixed(2),
        topCategory: topCategory
          ? { name: topCategory[0], total: +topCategory[1].toFixed(2) }
          : null,
      },
      data: expenses,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      category,
      paymentMethod,
      expenseDate,
      noted,
      images,
    } = req.body;

    const date = expenseDate ? new Date(expenseDate) : new Date();

    // Upload expense receipts safely
    const uploadedImages = await uploadMultipleImages(
      images,
      "expense_receipts",
    );

    const expense = await Expense.create({
      userId: req.user._id,
      amount,
      currency,
      amountUSD,
      category,
      paymentMethod,
      expenseDate: date,
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      images: uploadedImages,
      noted: noted || "",
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      category,
      paymentMethod,
      expenseDate,
      noted,
      images,
    } = req.body;

    const updateFields = {
      amount,
      currency,
      amountUSD,
      category,
      paymentMethod,
      noted,
    };

    // FIX: Only override images if new ones are passed in req.body
    if (images && Array.isArray(images) && images.length > 0) {
      const uploadedImages = await uploadMultipleImages(
        images,
        "expense_receipts",
      );
      updateFields.images = uploadedImages;
    }

    if (expenseDate) {
      const date = new Date(expenseDate);
      updateFields.expenseDate = date;
      updateFields.year = date.getFullYear();
      updateFields.monthNumber = date.getMonth() + 1;
      updateFields.day = date.getDate();
      updateFields.dayOfWeek = date.getDay();
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateFields,
      { new: true, runValidators: true },
    );

    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCategoryBreakdown = async (req, res) => {
  try {
    const { year, monthNumber } = req.query;
    const filter = { userId: req.user._id };
    if (year) filter.year = Number(year);
    if (monthNumber) filter.monthNumber = Number(monthNumber);

    const result = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amountUSD" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = result.reduce((s, r) => s + r.total, 0);
    const data = result.map((r) => ({
      category: r._id,
      total: +r.total.toFixed(2),
      count: r.count,
      percentage:
        grandTotal > 0 ? +((r.total / grandTotal) * 100).toFixed(1) : 0,
    }));

    res.json({ success: true, grandTotal: +grandTotal.toFixed(2), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getWeeklyPattern = async (req, res) => {
  try {
    const { year, monthNumber } = req.query;
    const filter = { userId: req.user._id };
    if (year) filter.year = Number(year);
    if (monthNumber) filter.monthNumber = Number(monthNumber);

    const result = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$dayOfWeek",
          total: { $sum: "$amountUSD" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const pattern = Array.from({ length: 7 }, (_, i) => {
      const found = result.find((r) => r._id === i);
      return {
        dayOfWeek: i,
        day: DAY_NAMES[i],
        total: found ? +found.total.toFixed(2) : 0,
        count: found ? found.count : 0,
      };
    });

    res.json({ success: true, data: pattern });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCalendarData = async (req, res) => {
  try {
    const { year, monthNumber } = req.query;
    if (!year || !monthNumber) {
      return res
        .status(400)
        .json({ success: false, message: "year and monthNumber required" });
    }

    const result = await Expense.aggregate([
      {
        $match: {
          userId: req.user._id,
          year: Number(year),
          monthNumber: Number(monthNumber),
        },
      },
      {
        $group: {
          _id: "$day",
          total: { $sum: "$amountUSD" },
          count: { $sum: 1 },
          items: {
            $push: {
              _id: "$_id",
              amount: "$amountUSD",
              category: "$category",
              noted: "$noted",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: result.map((r) => ({
        day: r._id,
        total: +r.total.toFixed(2),
        count: r.count,
        items: r.items,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getCategoryBreakdown,
  getWeeklyPattern,
  getCalendarData,
};
