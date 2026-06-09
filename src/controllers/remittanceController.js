const Remittance = require("../models/Remittance");
// 1. Import your configured cloudinary file
const cloudinary = require("../config/cloudinary");

// ─── GET /api/remittances ────────────────────────────────────────────────────
const getRemittances = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.monthNumber)
      filter.monthNumber = Number(req.query.monthNumber);
    if (req.query.recipient) filter.recipient = req.query.recipient;
    if (req.query.method) filter.method = req.query.method;

    const remittances = await Remittance.find(filter).sort({
      remittanceDate: -1,
    });

    const totalSent = remittances.reduce((s, r) => s + r.amountUSD, 0);
    const monthlyAvg = remittances.length ? totalSent / remittances.length : 0;

    const recipients = [...new Set(remittances.map((r) => r.recipient))];

    const byRecipient = remittances.reduce((acc, r) => {
      acc[r.recipient] = (acc[r.recipient] || 0) + r.amountUSD;
      return acc;
    }, {});

    res.json({
      success: true,
      count: remittances.length,
      stats: {
        totalSent: +totalSent.toFixed(2),
        monthlyAvg: +monthlyAvg.toFixed(2),
        recipients,
        byRecipient,
      },
      data: remittances,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/remittances/:id ────────────────────────────────────────────────
const getRemittance = async (req, res) => {
  try {
    const record = await Remittance.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Remittance not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/remittances ───────────────────────────────────────────────────
const createRemittance = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      recipient,
      recipientRelation,
      method,
      remittanceDate,
      noted,
      images, // 1. Read the array from the frontend form state
    } = req.body;

    const date = remittanceDate ? new Date(remittanceDate) : new Date();

    // 2. Loop through all images and upload Base64 elements to Cloudinary
    let imageUrls = [];
    if (images && Array.isArray(images)) {
      imageUrls = await Promise.all(
        images.map(async (img) => {
          if (img && img.startsWith("data:image")) {
            const response = await cloudinary.uploader.upload(img, {
              folder: "remittances",
              resource_type: "image",
            });
            return response.secure_url;
          }
          return img; // Fallback for pure string internet URLs
        }),
      );
    }

    const record = await Remittance.create({
      userId: req.user._id,
      amount,
      currency,
      amountUSD,
      recipient,
      recipientRelation,
      method,
      remittanceDate: date,
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      day: date.getDate(),
      images: imageUrls, // 3. Save the completed array into your database
      noted: noted || "",
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/remittances/:id ────────────────────────────────────────────────
const updateRemittance = async (req, res) => {
  try {
    const {
      amount,
      currency,
      amountUSD,
      recipient,
      recipientRelation,
      method,
      remittanceDate,
      noted,
      images, // 1. Read the array from the update payload
    } = req.body;

    // 2. Safely parse through mixed values (old URLs vs freshly added Base64 strings)
    let updatedImageUrls = [];
    if (images && Array.isArray(images)) {
      updatedImageUrls = await Promise.all(
        images.map(async (img) => {
          if (img && img.startsWith("data:image")) {
            const response = await cloudinary.uploader.upload(img, {
              folder: "remittances",
              resource_type: "image",
            });
            return response.secure_url;
          }
          return img; // Keeps existing Cloudinary string paths intact
        }),
      );
    }

    const updateFields = {
      amount,
      currency,
      amountUSD,
      recipient,
      recipientRelation,
      method,
      noted,
      images: updatedImageUrls, // Update database document with complete string array
    };

    if (remittanceDate) {
      const date = new Date(remittanceDate);
      updateFields.remittanceDate = date;
      updateFields.year = date.getFullYear();
      updateFields.monthNumber = date.getMonth() + 1;
      updateFields.day = date.getDate();
    }

    const record = await Remittance.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateFields,
      { new: true, runValidators: true },
    );

    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Remittance not found" });

    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/remittances/:id ─────────────────────────────────────────────
const deleteRemittance = async (req, res) => {
  try {
    const record = await Remittance.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Remittance not found" });
    res.json({ success: true, message: "Remittance deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRemittances,
  getRemittance,
  createRemittance,
  updateRemittance,
  deleteRemittance,
};
