// const mongoose = require("mongoose");
// const Block = require("./user.block");
// const Report = require("./user.report");
// const Profile = require("./profile.model");
// const User = require("../auth/auth.model");
// const redis = require("../../config/cache");
// const adminEvents = require("../../events/admin.events");

// // --- Actions ---

// // 1. Block User (URL Param se ID lega - Easy for Frontend)
// module.exports.blockUser = async (req, res) => {
//   try {
//     const targetId = req.params.id;
//     const userId = req.user._id;

//     if (userId.toString() === targetId)
//       return res
//         .status(400)
//         .json({ success: false, message: "Self-block not allowed" });

//     await Block.updateOne(
//       { blockerId: userId, blockedId: targetId },
//       { blockerId: userId, blockedId: targetId },
//       { upsert: true },
//     );
//     if (redis) {
//       const CACHE_KEY = `feed:${userId.toString()}`;
//       await redis.del(CACHE_KEY);
//       console.log("Redis cache cleared for new filters");
//     }
//     res
//       .status(200)
//       .json({ success: true, message: "User blocked successfully" });
//   } catch (e) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

// // 2. Report User(URL Param se ID + Body se Reason)


// module.exports.reportUser = async (req, res) => {
//   const reporterId = req.user._id;

//   try {
//     const { reason, description, context } = req.body;
//     const { matchId, lastMessages } = context || {};

//     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//       return res.status(400).json({ success: false, message: "Invalid reported user ID" });
//     }

//     const [reporterProfile, reportedUserExists] = await Promise.all([
//       Profile.findOne({ userId: reporterId }).select("_id nickname").lean(),
//       User.exists({ _id: req.params.id })
//     ]);

//     if (!reporterProfile) {
//       return res.status(404).json({ success: false, message: "Reporter profile not found" });
//     }

//     if (!reportedUserExists) {
//       return res.status(404).json({ success: false, message: "Reported user not found" });
//     }

//     let severity = "low";
//     if (reason === "Harassment" || reason === "Fake Profile") {
//       severity = "high";
//     }

//     const newReport = await Report.create({
//       type: matchId ? "chat" : "profile",
//       reporterId,
//       reporterProfile: reporterProfile._id,
//       reportedId: req.params.id,
//       matchId: matchId || null,
//       evidence: lastMessages || [],
//       reason,
//       description,
//       status: "new",
//       severity,
//     });

//     // Fire real-time admin alert
//     try {
//       adminEvents.emit("new_live_activity", {
//         id: newReport._id,
//         createdAt: new Date(),
//         description: `New report by ${reporterProfile.nickname || "User"}`,
//         color: "#F75555"
//       });
//     } catch (err) {
//       console.error("Admin event emit failed", err);
//     }

//     // Redis clear
//     if (redis) {
//       const CACHE_KEY = `feed:${reporterId.toString()}`;
//       await redis.del(CACHE_KEY);
//     }

//     return res.status(201).json({
//       success: true,
//       message: "Report submitted successfully",
//     });
//   } catch (e) {
//     console.error("Report error:", e);
//     return res.status(500).json({
//       success: false,
//       message: e.message,
//     });
//   }
// };

// // 3. Get Blocked Users (Figma Design Format)
// exports.getBlockList = async (req, res) => {
//   try {
//     const myId = req.user._id;

//     // 1. Un logo ki IDs nikalo jinhe Anubhav ne block kiya hai
//     const blocks = await Block.find({ blockerId: myId }).select("blockedId").lean();

//     if (!blocks.length) {
//       return res.status(200).json({
//         success: true,
//         count: 0,
//         data: [],
//       });
//     }

//     // 2. Sirf blocked users ki IDs ka ek array banao
//     const blockedUserIds = blocks.map((b) => b.blockedId);

//     // 3. Un blocked logo ki profiles fetch karo (Anubhav ki nahi)
//     const profiles = await Profile.find({
//       userId: { $in: blockedUserIds },
//     })
//       .select("userId nickname dob photos location about")
//       .lean();

//     // 4. Figma ke liye data format karo
//     const formattedData = profiles.map((p) => ({
//       id: p.userId,
//       name: p.nickname || "User",
//       age: p.dob
//         ? Math.floor((new Date() - new Date(p.dob)) / 31557600000)
//         : 25,
//       distance: "7 km away", // Calculation logic yahan add kar sakte ho
//       image: p.photos && p.photos.length > 0 ? p.photos[0].url : "",
//     }));

//     // 5. Final Professional Response
//     return res.status(200).json({
//       success: true,
//       title: `Blocked Users (${formattedData.length})`,
//       data: formattedData, // Yeh ab Array aayega
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Error fetching list" });
//   }
// };

// // 4. Unblock User (URL Param)
// module.exports.unblockUser = async (req, res) => {
//   const userId = req.user._id;
//   try {
//     await Block.deleteOne({
//       blockerId: req.user._id,
//       blockedId: req.params.id,
//     });
//     if (redis) {
//       const CACHE_KEY = `feed:${userId.toString()}`;
//       await redis.del(CACHE_KEY);
//       console.log("Redis cache cleared for new filters");
//     }
//     res.status(200).json({ success: true, message: "User unblocked" });
//   } catch (e) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// };


const mongoose = require("mongoose");
const Block = require("./user.block");
const Report = require("./user.report");
const Profile = require("./profile.model");
const User = require("../auth/auth.model");
const redis = require("../../config/cache");
const adminEvents = require("../../events/admin.events");

// ─────────────────────────────────────────
// Helper: Cache clear karo properly
// ─────────────────────────────────────────
async function clearFeedCache(...userIds) {
  if (!redis) return;
  try {
    const ops = userIds.flatMap(id => [
      redis.del(`feed:${id.toString()}`),
      redis.del(`feed:exclude:${id.toString()}`), // ✅ Ye bhi clear karo
    ]);
    await Promise.all(ops);
  } catch (e) {
    console.error("Cache clear error:", e.message);
  }
}

// ─────────────────────────────────────────
// 1. Block User
// ─────────────────────────────────────────
module.exports.blockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    // Self block check
    if (userId.toString() === targetId) {
      return res.status(400).json({
        success: false,
        message: "Self-block not allowed"
      });
    }

    // ✅ findOneAndUpdate with upsert — no duplicate error
    await Block.findOneAndUpdate(
      { blockerId: userId, blockedId: targetId },
      { blockerId: userId, blockedId: targetId },
      { upsert: true, new: true }
    );

    // ✅ Clear both users feed cache
    await clearFeedCache(userId, targetId);

    return res.status(200).json({
      success: true,
      message: "User blocked successfully"
    });

  } catch (err) {
    // ✅ Duplicate key = already blocked = still success
    if (err.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "User already blocked"
      });
    }
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ─────────────────────────────────────────
// 2. Report User
// ─────────────────────────────────────────
module.exports.reportUser = async (req, res) => {
  const reporterId = req.user._id;

  try {
    const { reason, description, context } = req.body;
    const { matchId, lastMessages } = context || {};
    const reportedId = req.params.id;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(reportedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reported user ID"
      });
    }

    // ✅ Parallel queries — faster
    const [reporterProfile, reportedUserExists] = await Promise.all([
      Profile.findOne({ userId: reporterId })
        .select("_id nickname")
        .lean(),
      User.exists({ _id: reportedId })
    ]);

    if (!reporterProfile) {
      return res.status(404).json({
        success: false,
        message: "Reporter profile not found"
      });
    }

    if (!reportedUserExists) {
      return res.status(404).json({
        success: false,
        message: "Reported user not found"
      });
    }

    // Severity logic
    const highSeverityReasons = ["Harassment", "Fake Profile"];
    const severity = highSeverityReasons.includes(reason) ? "high" : "low";

    // Create report
    const newReport = await Report.create({
      type: matchId ? "chat" : "profile",
      reporterId,
      reporterProfile: reporterProfile._id,
      reportedId,
      matchId: matchId || null,
      evidence: lastMessages || [],
      reason,
      description,
      status: "new",
      severity,
    });

    // Admin event — non blocking
    try {
      adminEvents.emit("new_live_activity", {
        id: newReport._id,
        createdAt: new Date(),
        description: `New report by ${reporterProfile.nickname || "User"}`,
        color: "#F75555"
      });
    } catch (err) {
      console.error("Admin event emit failed:", err.message);
    }

    // ✅ Clear feed cache
    await clearFeedCache(reporterId);

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
    });

  } catch (err) {
    console.error("Report error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ─────────────────────────────────────────
// 3. Get Block List
// ─────────────────────────────────────────
exports.getBlockList = async (req, res) => {
  try {
    const myId = req.user._id;

    // ✅ Get blocked IDs
    const blocks = await Block.find({ blockerId: myId })
      .select("blockedId")
      .lean();

    if (!blocks.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const blockedUserIds = blocks.map((b) => b.blockedId);

    // ✅ Fetch profiles
    const profiles = await Profile.find({
      userId: { $in: blockedUserIds },
    })
      .select("userId nickname dob photos")
      .lean();

    // ✅ Format response
    const formattedData = profiles.map((p) => ({
      id: p.userId,
      name: p.nickname || "User",
      age: p.dob
        ? Math.floor((Date.now() - new Date(p.dob)) / 31557600000)
        : null,
      image: p.photos?.[0]?.url || "",
    }));
    
    return res.status(200).json({
      success: true,
      count: formattedData.length,
      title: `Blocked Users (${formattedData.length})`,
      data: formattedData,
    });

  } catch (err) {
    console.error("getBlockList error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching block list"
    });
  }
};

// ─────────────────────────────────────────
// 4. Unblock User
// ─────────────────────────────────────────
module.exports.unblockUser = async (req, res) => {
  const userId = req.user._id;
  try {
    await Block.deleteOne({
      blockerId: userId,
      blockedId: req.params.id,
    });

    // ✅ Clear cache properly
    await clearFeedCache(userId, req.params.id);

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};