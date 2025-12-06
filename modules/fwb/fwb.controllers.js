const FWB = require("./fwb.model");
const { fwbValidation, fwbUpdateValidation } = require("./fwb.validation");

/*==================================================
1. GET ALL FWB Offer (active + expired both)
===================================================*/
exports.getAllFWB = async (req, res) => {
  try {
    const now = new Date();

    // 1️. Auto-disable expired offers (real-time update)
    await FWB.updateMany(
      { expire_time: { $lte: now }, is_active: true },
      { $set: { is_active: false } }
    );

    // 2️. Count active + expired
    const [active_count, expired_count] = await Promise.all([
      FWB.countDocuments({ is_active: true }),
      FWB.countDocuments({ is_active: false }),
    ]);

    // 3️. Get all offers (active first → expired later)
    const data = await FWB.find()
      .select("-code")
      .sort({ is_active: -1, expire_time: 1 });

    // is_active: -1 → active on top
    // expire_time: 1 → nearest expiry first

    return res.json({
      success: true,
      message: "All FWB offers fetched",
      active_count,
      expired_count,
      data,
    });
  } catch (err) {
    console.error("Get All FWB Error →", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// exports.getAllFWB = async (req, res) => {
//   try {
//     const list = await FWB.find().select("-code").sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       message: "All FWB data fetched",
//       data: list,
//     });
//   } catch (err) {
//     console.error("Get All FWB Error →", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// exports.getAllFWB = async (req, res) => {
//   try {
//     const now = new Date();

//     const list = await FWB.aggregate([
//       {
//         $addFields: {
//           isExpired: { $lt: ["$expire_time", now] }, // true if expired
//         },
//       },
//       {
//         $sort: {
//           isExpired: 1, // false (active) → top, true (expired) → bottom
//           createdAt: -1, // newest first
//         },
//       },
//     ]);

//     res.json({
//       success: true,
//       message: "All FWB data fetched",
//       data: list,
//     });
//   } catch (err) {
//     console.error("Get All FWB Error →", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// GET SINGLE BY ID

/*==================================================
2. GET Single FWB Offer
===================================================*/
exports.getSingleFWB = async (req, res) => {
  try {
    const { id } = req.query;

    const data = await FWB.findById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "FWB not found" });
    }

    res.json({
      success: true,
      message: "FWB details fetched",
      data,
    });
  } catch (err) {
    console.error("Get Single FWB Error →", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*==================================================
3. CREATE or ADD FWB Offer
===================================================*/
exports.createFWB = async (req, res) => {
  try {
    // Validate body
    const { error } = fwbValidation.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const created = await FWB.create(req.body);

    return res.status(201).json({
      success: true,
      message: "FWB created successfully",
      data: created,
    });
  } catch (err) {
    console.error("Create FWB Error →", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*==================================================
4. UPDATE or PATCH FWB Offer
===================================================*/
exports.updateFWB = async (req, res) => {
  try {
    // Validate body
    const { error } = fwbUpdateValidation.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { id } = req.query;

    // --- AUTO UPDATE LOGIC ---
    // If expire_time is included in request, force is_active = true
    if (req.body.expire_time) {
      const newDate = new Date(req.body.expire_time);
      req.body.is_active = newDate > new Date();
    }

    const updated = await FWB.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "FWB not found",
      });
    }

    res.json({
      success: true,
      message: "FWB updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update FWB Error →", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*==================================================
5. DELETE FWB Offer
===================================================*/
exports.deleteFWB = async (req, res) => {
  try {
    const { id } = req.query;

    const deleted = await FWB.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "FWB not found" });
    }

    res.json({
      success: true,
      message: "FWB deleted successfully",
    });
  } catch (err) {
    console.error("Delete FWB Error →", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
