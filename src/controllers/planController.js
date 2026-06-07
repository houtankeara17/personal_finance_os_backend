const Plan = require("../models/Plan");
// 1. Import your configured cloudinary file
const cloudinary = require("../config/cloudinary");

// ─── HELPER FUNCTION FOR MULTIPLE IMAGES ─────────────────────────────────────
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
    return img; // Return unchanged if it is already a Cloudinary URL
  });

  return Promise.all(uploadPromises);
};

// ─── GET /api/plans ──────────────────────────────────────────────────────────
const getPlans = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const plans = await Plan.find(filter).sort({ status: 1, createdAt: -1 });

    // Stats
    const totalTargetUSD = plans.reduce((s, r) => s + r.targetAmountUSD, 0);
    const totalFunded = plans.reduce((s, r) => s + r.currentFunding, 0);
    const accomplished = plans.filter(
      (r) => r.status === "Accomplished",
    ).length;

    // Group by status
    const byStatus = plans.reduce((acc, r) => {
      if (!acc[r.status]) acc[r.status] = [];
      acc[r.status].push(r);
      return acc;
    }, {});

    res.json({
      success: true,
      count: plans.length,
      stats: {
        totalTargetUSD: +totalTargetUSD.toFixed(2),
        totalFunded: +totalFunded.toFixed(2),
        accomplished,
        overallProgress:
          totalTargetUSD > 0
            ? +((totalFunded / totalTargetUSD) * 100).toFixed(1)
            : 0,
      },
      byStatus,
      data: plans,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/plans/:id ──────────────────────────────────────────────────────
const getPlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/plans ─────────────────────────────────────────────────────────
const createPlan = async (req, res) => {
  try {
    const {
      title,
      description,
      targetAmount,
      currency,
      targetAmountUSD,
      currentFunding,
      targetDate,
      status,
      priority,
      images,
      noted,
    } = req.body;

    // 2. Upload array of images to Cloudinary folder "plan_goals"
    const uploadedImages = await uploadMultipleImages(images, "plan_goals");

    const plan = await Plan.create({
      userId: req.user._id,
      title,
      description,
      targetAmount,
      currency,
      targetAmountUSD,
      currentFunding: currentFunding || 0,
      targetDate: targetDate || null,
      status: status || "Dreaming",
      priority: priority || "Medium",
      images: uploadedImages, // Save Cloudinary URLs
      noted: noted || "",
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/plans/:id ──────────────────────────────────────────────────────
const updatePlan = async (req, res) => {
  try {
    const {
      title,
      description,
      targetAmount,
      currency,
      targetAmountUSD,
      currentFunding,
      targetDate,
      status,
      priority,
      images,
      noted,
    } = req.body;

    // 3. Process image updates safely
    const uploadedImages = await uploadMultipleImages(images, "plan_goals");

    const plan = await Plan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        title,
        description,
        targetAmount,
        currency,
        targetAmountUSD,
        currentFunding,
        targetDate,
        status,
        priority,
        images: uploadedImages, // Update database with cloud URLs
        noted,
      },
      { new: true, runValidators: true },
    );

    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/plans/:id/fund ───────────────────────────────────────────────
const addFunding = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid amount required" });
    }

    const plan = await Plan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });

    plan.currentFunding += amount;

    if (
      plan.currentFunding >= plan.targetAmountUSD &&
      plan.status !== "Accomplished"
    ) {
      plan.status = "Accomplished";
    } else if (plan.currentFunding > 0 && plan.status === "Dreaming") {
      plan.status = "Active Allocation";
    }

    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/plans/:id ───────────────────────────────────────────────────
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    res.json({ success: true, message: "Plan deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/plans/all ───────────────────────────────────────────────────
const deleteAllPlans = async (req, res) => {
  try {
    const result = await Plan.deleteMany({ userId: req.user._id });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  addFunding,
  deletePlan,
  deleteAllPlans,
};
