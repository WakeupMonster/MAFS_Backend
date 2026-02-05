/* eslint-disable no-unused-vars */
// controllers/admin/admin.kpi.controller.js

const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const Report = require("../../profile/user.report");
const redis = require("../../../config/cache");
const Block = require("../../profile/user.block");
const utils = require("../../auth/auth.utils")

module.exports.verifyUserProfile = async (req, res) => {
  const adminId = req.user.id;
  const userId = req.params.userId;
  const { action, reason } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Invalid action",
    });
  }

  if (action === "reject" && !reason) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason required",
    });
  }

  const profile = await Profile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: "Profile not found",
    });
  }

  if (profile.verification.status !== "pending") {
    return res.status(409).json({
      success: false,
      message: `Profile already ${profile.verification.status}`,
    });
  }

  // const before = {
  //   status: profile.verification.status
  // };

  if (action === "approve") {
    profile.verification.status = "approved";
    profile.verification.verifiedBy = adminId;
    profile.verification.verifiedAt = new Date();
    profile.verification.rejectionReason = null;
  } else {
    profile.verification.status = "rejected";
    profile.verification.verifiedBy = adminId;
    profile.verification.verifiedAt = new Date();
    profile.verification.rejectionReason = reason;
  }

  await profile.save();

  // Audit log
  // await AuditLog.create({
  //   actorId: adminId,
  //   action:
  //     action === "approve"
  //       ? "USER_VERIFICATION_APPROVED"
  //       : "USER_VERIFICATION_REJECTED",
  //   entityType: "USER",
  //   entityId: userId,
  //   before,
  //   after: { status: profile.verification.status },
  //   reason
  // });

  // Invalidate KPI cache
  if (redis) {
    await redis.del("admin:kpi:overview");
  }

  return res.json({
    success: true,
    message:
      action === "approve"
        ? "User verified successfully"
        : "User verification rejected",
  });
};

module.exports.banUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    const { category, reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Ban reason is required",
      });
    }

    if (adminId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot ban yourself",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.banDetails?.isBanned) {
      return res.status(409).json({
        success: false,
        message: "User already banned",
      });
    }

    // const before = { isBanned: false };

    user.banDetails = {
      isBanned: true,
      reason,
      bannedBy: adminId,
      bannedAt: new Date(),
    };

    user.accountStatus = "banned";
    await user.save();

    // Audit log
    // await AuditLog.create({
    //   actorId: adminId,
    //   actorRole: "ADMIN",
    //   action: "USER_BAN",
    //   entityType: "USER",
    //   entityId: userId,
    //   before,
    //   after: { isBanned: true },
    //   reason
    // });

    // Invalidate caches
    if (redis) {
      await redis.del("admin:kpi:overview");
      await redis.del(`user:${userId}`);
    }

    return res.json({
      success: true,
      message: "User banned successfully",
    });
  } catch (err) {
    console.error("Ban user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to ban user",
    });
  }
};

module.exports.unbanUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    // const { reason } = req.body;

    if (!adminId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    // Safe Comparison
    if (adminId.toString() === userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot unban yourself" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Safe check for ban status
    if (!user.banDetails?.isBanned) {
      return res
        .status(409)
        .json({ success: false, message: "User is not banned" });
    }

    // const before = { isBanned: true };

    // Update with safety for undefined banDetails
    user.banDetails = {
      ...user.banDetails,
      isBanned: false,
      unbannedBy: adminId,
      unbannedAt: new Date(),
      reason: null,
      bannedBy: null,
      bannedAt: null,
    };

    user.accountStatus = "active";
    await user.save();

    // Audit log
    // await AuditLog.create({
    //   actorId: adminId,
    //   actorRole: "ADMIN",
    //   action: "USER_UNBAN",
    //   entityType: "USER",
    //   entityId: userId,
    //   before,
    //   after: { isBanned: false },
    //   reason
    // });

    // Invalidate caches
    if (redis) {
      await redis.del("admin:kpi:overview");
      await redis.del(`user:${userId}`);
    }

    return res.json({
      success: true,
      message: "User unbanned successfully",
    });
  } catch (err) {
    console.error("Unban user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to unban user",
    });
  }
};

module.exports.suspendUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    const { reason, durationHours } = req.body;

    if (!reason || !durationHours || durationHours <= 0) {
      return res.status(400).json({
        success: false,
        message: "Reason and valid duration are required",
      });
    }

    if (adminId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot suspend yourself",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.banDetails?.isBanned) {
      return res.status(409).json({
        success: false,
        message: "User is banned. Cannot suspend.",
      });
    }

    if (user.suspensionDetails?.isSuspended) {
      return res.status(409).json({
        success: false,
        message: "User already suspended",
      });
    }

    const suspendUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // const before = { isSuspended: false };

    user.suspensionDetails = {
      isSuspended: true,
      reason,
      suspendedBy: adminId,
      suspendedAt: new Date(),
      suspendUntil,
    };

    user.accountStatus = "suspended";
    await user.save();

    // // Audit log
    // await AuditLog.create({
    //   actorId: adminId,
    //   actorRole: "ADMIN",
    //   action: "USER_SUSPEND",
    //   entityType: "USER",
    //   entityId: userId,
    //   before,
    //   after: {
    //     isSuspended: true,
    //     suspendUntil
    //   },
    //   reason
    // });

    // Cache invalidation
    if (redis) {
      await redis.del("admin:kpi:overview");
      await redis.del(`user:${userId}`);
    }

    return res.json({
      success: true,
      message: `User suspended for ${durationHours} hours`,
    });
  } catch (err) {
    console.error("Suspend user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to suspend user",
    });
  }
};

module.exports.replyToReport = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const report = await Report.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (!Array.isArray(report.replyHistory)) {
      report.replyHistory = [];
    }
    report.replyHistory.push({
      message,
      repliedBy: adminId,
      repliedAt: new Date(),
    });
    report.handledBy = adminId;
    // Move to in-progress automatically
    if (report.status === "new") {
      report.status = "in_progress";
    }

    await report.save();

    // Send email (pseudo)
    // await utils.sendEmail(
    //   report.reporterId.email,
    //   "We are reviewing your report",
    //   message
    // );
    const reporter = await User.findById(report.reporterId).select("email");

    if (reporter?.email) {
      await utils.sendEmail(
        reporter.email,
        "We are reviewing your report",
        `<p>${message}</p><p>— Support Team</p>`
      );
    } else {
      console.log(
        `Report reply skipped email: reporter ${report.reporterId} has no email`
      );
    }

    res.json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send reply",
      error: err.message,
    });
  }
};

module.exports.updateReportStatus = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { status, notifyUser } = req.body;

    if (!["new", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const report = await Report.findById(req.params.reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    report.status = status;

    if (status === "resolved") {
      report.resolvedBy = adminId;
      report.resolvedAt = new Date();

      if (notifyUser && report.reporterId.email) {
        await utils.sendEmail(
          report.reporterId.email,
          "Your report has been resolved",
          "Thanks for reporting. We have taken appropriate action."
        );
      }
    }

    await report.save();

    res.json({
      success: true,
      message: "Report status updated",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update report status",
    });
  }
};

module.exports.getBlockedUsers = async (req, res) => {
  try {
    const { blockerId, blockedId, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (blockerId) filter.blockerId = blockerId;
    if (blockedId) filter.blockedId = blockedId;

    const blocks = await Block.find(filter)
      .populate("blockerId", "phone email")
      .populate("blockedId", "phone email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Block.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        blocks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
        },
      },
    });
  } catch (err) {
    console.error("Admin block list error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load block data",
    });
  }
};

// module.exports.getPendingVerifications = async (req, res, next) => {
//   try {
//     // Find all profiles with pending verification
//     const pendingProfiles = await Profile.aggregate([
//       {
//         $match: {
//           "verification.status": "pending",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       { $unwind: "$user" },
//       {
//         $project: {
//           _id: 1,
//           userId: 1,
//           verification: 1,
//           "user.email": 1,
//           "user.phone": 1,
//           "user.createdAt": 1,
//           profilePhoto: 1,
//           fullName: 1,
//         },
//       },
//       { $sort: { createdAt: -1 } },
//     ]);
//     res.json({
//       success: true,
//       count: pendingProfiles.length,
//       data: pendingProfiles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch pending verifications",
//     });
//   }
// };



// module.exports.getPendingVerifications = async (req, res, next) => {
//   try {
//     const pendingProfiles = await Profile.aggregate([
//       {
//         $match: {
//           "verification.status": "pending",
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       { $unwind: "$user" },
//       {
//         $project: {
//           _id: 1,
//           userId: 1,
//           nickname: 1,                    
//           age: 1,                         
//           gender: 1,                      
//           about: 1,                       
//           jobTitle: 1,                    
//           company: 1,                     
//           school: 1,                      
//           "location.city": 1,             
//           "location.state": 1,            
//           "location.country": 1,          
//           "verification.status": 1,
//           "verification.selfieUrl": 1,
//           "verification.docUrl": 1,
//           "verification.submittedAt": 1,  // ⭐ ADDED
//           "verification.rejectionReason": 1,
//           "photos.publicId" : 1,
//           "user._id": 1,
//           "user.email": 1,
//           "user.phone": 1,
//           "user.createdAt": 1,
//           "user.isPhoneVerified": 1,      // ⭐ ADDED
//           "user.isEmailVerified": 1,      // ⭐ ADDED
//           createdAt: 1,
//           updatedAt: 1,
//         },
//       },
//       { 
//         $sort: { 
//           "verification.submittedAt": -1,
//           createdAt: -1 
//         } 
//       },
//     ]);

//     res.json({
//       success: true,
//       count: pendingProfiles.length,
//       data: pendingProfiles,
//     });
//   } catch (error) {
//     console.error("Error fetching pending verifications:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch pending verifications",
//       error: error.message,
//     });
//   }
// };







module.exports.getPendingVerifications = async (req, res, next) => {
  try {
    // 1. Frontend se status mangwao (e.g., /api/verifications?status=approved)
    const { status } = req.query;

    console.log(status)

    // 2. Dynamic Match Object banayein
    // Agar status 'all' hai toh filter hata do, warna specific status search karo
    let matchQuery = {};
    if (status && status !== "all") {
      matchQuery["verification.status"] = status;
    } else if (!status) {
      // Default behavior: agar kuch na bheje toh pending dikhao
      matchQuery["verification.status"] = "pending";
    }

    const pendingProfiles = await Profile.aggregate([
      {
        $match: matchQuery, // ⭐ Ab ye dynamic hai
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          userId: 1,
          nickname: 1,
          age: 1,
          gender: 1,
          about: 1,
          jobTitle: 1,
          company: 1,
          school: 1,
          "location.city": 1,
          "location.state": 1,
          "location.country": 1,
          "verification.status": 1,
          "verification.selfieUrl": 1,
          "verification.docUrl": 1,
          "verification.submittedAt": 1,
          "verification.rejectionReason": 1,
          "photos.publicId": 1,
          "user._id": 1,
          "user.email": 1,
          "user.phone": 1,
          "user.createdAt": 1,
          "user.isPhoneVerified": 1,
          "user.isEmailVerified": 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: {
          "verification.submittedAt": -1,
          createdAt: -1,
        },
      },
    ]);

    res.json({
      success: true,
      count: pendingProfiles.length,
      data: pendingProfiles,
    });
  } catch (error) {
    console.error("Error fetching verifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch verifications",
      error: error.message,
    });
  }
};