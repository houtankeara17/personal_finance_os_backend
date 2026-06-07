const ExchangeLog = require("../models/ExchangeLog");
const Expense = require("../models/Expense");
// 1. Import your configured cloudinary file
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

// ─── HELPER FUNCTION FOR MULTIPLE IMAGES ─────────────────────────────────────
// Loops through an array, uploads base64 strings to Cloudinary, leaves existing URLs alone
const uploadMultipleImages = async (imagesArray, folderName) => {
  if (!imagesArray || !Array.isArray(imagesArray)) return [];

  const uploadPromises = imagesArray.map(async (img) => {
    if (img && img.startsWith("data:image")) {
      const response = await cloudinary.uploader.upload(img, {
        folder: folderName,
        resource_type: "image",
      });
      return response.secure_url;
    }
    return img; // Return as-is if it's already a URL string
  });

  return Promise.all(uploadPromises);
};

// =============================================================================
// ─── EXCHANGE LOG CONTROLLERS ────────────────────────────────────────────────
// =============================================================================

const getExchangeLogs = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.monthNumber)
      filter.monthNumber = Number(req.query.monthNumber);
    if (req.query.day) filter.day = Number(req.query.day);
    if (req.query.fromCurrency) filter.fromCurrency = req.query.fromCurrency;
    if (req.query.toCurrency) filter.toCurrency = req.query.toCurrency;
    if (req.query.provider) filter.provider = req.query.provider;

    const logs = await ExchangeLog.find(filter).sort({ exchangeDate: -1 });

    const totalFromAmount = logs.reduce((s, r) => s + r.fromAmount, 0);
    const totalToAmount = logs.reduce((s, r) => s + r.toAmount, 0);
    const avgRate = logs.length
      ? logs.reduce((s, r) => s + r.rateUsed, 0) / logs.length
      : 0;

    const byPair = logs.reduce((acc, r) => {
      const key = `${r.fromCurrency}→${r.toCurrency}`;
      if (!acc[key]) acc[key] = { count: 0, totalFrom: 0, totalTo: 0 };
      acc[key].count++;
      acc[key].totalFrom += r.fromAmount;
      acc[key].totalTo += r.toAmount;
      return acc;
    }, {});

    const byProvider = logs.reduce((acc, r) => {
      acc[r.provider] = (acc[r.provider] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      count: logs.length,
      stats: {
        totalFromAmount: +totalFromAmount.toFixed(2),
        totalToAmount: +totalToAmount.toFixed(2),
        avgRate: +avgRate.toFixed(4),
        byPair,
        byProvider,
      },
      data: logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getExchangeLog = async (req, res) => {
  try {
    const log = await ExchangeLog.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!log)
      return res
        .status(404)
        .json({ success: false, message: "Exchange log not found" });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createExchangeLog = async (req, res) => {
  try {
    const {
      fromCurrency,
      fromAmount,
      toCurrency,
      toAmount,
      rateUsed,
      officialRate,
      provider,
      providerNote,
      exchangeDate,
      noted,
      images,
    } = req.body;

    const date = exchangeDate ? new Date(exchangeDate) : new Date();

    // Upload transaction receipt images to Cloudinary
    const uploadedImages = await uploadMultipleImages(
      images,
      "exchange_receipts",
    );

    const log = await ExchangeLog.create({
      userId: req.user._id,
      fromCurrency,
      fromAmount,
      toCurrency,
      toAmount,
      rateUsed,
      officialRate: officialRate || null,
      provider,
      providerNote: providerNote || "",
      exchangeDate: date,
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      images: uploadedImages,
      noted: noted || "",
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateExchangeLog = async (req, res) => {
  try {
    const {
      fromCurrency,
      fromAmount,
      toCurrency,
      toAmount,
      rateUsed,
      officialRate,
      provider,
      providerNote,
      exchangeDate,
      noted,
      images,
    } = req.body;

    // Handle mix of old URLs and new Base64 strings safely
    const uploadedImages = await uploadMultipleImages(
      images,
      "exchange_receipts",
    );

    const updateFields = {
      fromCurrency,
      fromAmount,
      toCurrency,
      toAmount,
      rateUsed,
      officialRate,
      provider,
      providerNote,
      noted,
      images: uploadedImages,
    };

    if (exchangeDate) {
      const date = new Date(exchangeDate);
      updateFields.exchangeDate = date;
      updateFields.year = date.getFullYear();
      updateFields.monthNumber = date.getMonth() + 1;
      updateFields.day = date.getDate();
      updateFields.dayOfWeek = date.getDay();
    }

    const log = await ExchangeLog.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateFields,
      { new: true, runValidators: true },
    );

    if (!log)
      return res
        .status(404)
        .json({ success: false, message: "Exchange log not found" });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteExchangeLog = async (req, res) => {
  try {
    const log = await ExchangeLog.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!log)
      return res
        .status(404)
        .json({ success: false, message: "Exchange log not found" });
    res.json({ success: true, message: "Exchange log deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getVolumeAnalytics = async (req, res) => {
  try {
    const { groupBy = "month", year, fromCurrency, toCurrency } = req.query;
    const filter = { userId: req.user._id };
    if (year) filter.year = Number(year);
    if (fromCurrency) filter.fromCurrency = fromCurrency;
    if (toCurrency) filter.toCurrency = toCurrency;

    let groupId;
    if (groupBy === "day")
      groupId = { year: "$year", month: "$monthNumber", day: "$day" };
    if (groupBy === "week")
      groupId = { year: "$year", dayOfWeek: "$dayOfWeek" };
    if (groupBy === "month") groupId = { year: "$year", month: "$monthNumber" };
    if (groupBy === "year") groupId = { year: "$year" };

    const result = await ExchangeLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: groupId,
          totalFrom: { $sum: "$fromAmount" },
          totalTo: { $sum: "$toAmount" },
          count: { $sum: 1 },
          avgRate: { $avg: "$rateUsed" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    ]);

    res.json({ success: true, groupBy, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getExchangeLogs,
  getExchangeLog,
  createExchangeLog,
  updateExchangeLog,
  deleteExchangeLog,
  getVolumeAnalytics,
  deleteExchangeLog,
};
