const Bonus = require("../models/Bonus");
// 1. Import your configured cloudinary file (adjust the path if yours is different)
const cloudinary = require("../config/cloudinary");

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

// ─── GET /api/bonuses ────────────────────────────────────────────────────────
const getBonuses = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.monthNumber)
      filter.monthNumber = Number(req.query.monthNumber);
    if (req.query.tag) filter.tag = req.query.tag;
    if (req.query.status) filter.status = req.query.status;

    const bonuses = await Bonus.find(filter).sort({
      year: -1,
      monthNumber: -1,
      createdAt: -1,
    });

    const totalEarned = bonuses.reduce((s, r) => s + r.amountUSD, 0);
    const monthlyAvg = bonuses.length ? totalEarned / bonuses.length : 0;
    const highestRecord = bonuses.reduce(
      (max, r) => (r.amountUSD > (max?.amountUSD || 0) ? r : max),
      null,
    );

    const byTag = bonuses.reduce((acc, r) => {
      acc[r.tag] = (acc[r.tag] || 0) + r.amountUSD;
      return acc;
    }, {});

    res.json({
      success: true,
      count: bonuses.length,
      stats: {
        totalEarned: +totalEarned.toFixed(2),
        monthlyAvg: +monthlyAvg.toFixed(2),
        highestRecord: highestRecord
          ? {
              month: highestRecord.month,
              year: highestRecord.year,
              amount: highestRecord.amountUSD,
              tag: highestRecord.tag,
            }
          : null,
        byTag,
      },
      data: bonuses,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/bonuses/:id ────────────────────────────────────────────────────
const getBonus = async (req, res) => {
  try {
    const bonus = await Bonus.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!bonus)
      return res
        .status(404)
        .json({ success: false, message: "Bonus record not found" });
    res.json({ success: true, data: bonus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/bonuses ───────────────────────────────────────────────────────
const createBonus = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      year,
      monthNumber,
      tag,
      status,
      image,
      noted,
    } = req.body;

    let imageUrl = "";

    // 2. Check if an image is sent as a base64 data string
    if (image && image.startsWith("data:image")) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "bonus_proofs", // Keeps your Cloudinary account organized
        resource_type: "image",
      });
      imageUrl = uploadResponse.secure_url;
    } else if (image) {
      imageUrl = image; // fallback if it's already a URL string
    }

    const bonus = await Bonus.create({
      userId: req.user._id,
      amount,
      currency,
      amountUSD,
      ...buildPeriodFields(year, monthNumber),
      tag,
      status,
      image: imageUrl, // Save the cloud link here
      noted: noted || "",
    });

    res.status(201).json({ success: true, data: bonus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/bonuses/:id ────────────────────────────────────────────────────
const updateBonus = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      year,
      monthNumber,
      tag,
      status,
      image,
      noted,
    } = req.body;

    let imageUrl = image;

    // 3. If a new base64 image string is provided during update, upload it
    if (image && image.startsWith("data:image")) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "bonus_proofs",
        resource_type: "image",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const bonus = await Bonus.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        amount,
        currency,
        amountUSD,
        ...(year && monthNumber ? buildPeriodFields(year, monthNumber) : {}),
        tag,
        status,
        image: imageUrl, // Update database with new Cloudinary URL
        noted,
      },
      { new: true, runValidators: true },
    );

    if (!bonus)
      return res
        .status(404)
        .json({ success: false, message: "Bonus record not found" });
    res.json({ success: true, data: bonus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/bonuses/:id ─────────────────────────────────────────────────
const deleteBonus = async (req, res) => {
  try {
    const bonus = await Bonus.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!bonus)
      return res
        .status(404)
        .json({ success: false, message: "Bonus record not found" });
    res.json({ success: true, message: "Bonus record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getBonuses,
  getBonus,
  createBonus,
  updateBonus,
  deleteBonus,
};
