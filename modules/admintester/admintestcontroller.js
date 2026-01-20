/* eslint-disable no-unused-vars */
// controllers/admin/admin.kpi.controller.js

const User = require("../auth/auth.model");
const Profile = require("../profile/profile.model");
const Report = require("../profile/user.report");
const UserSubscription = require("../auth/UserSubscription.model");
const redis = require("../../config/cache"); 
const Block = require("../profile/user.block")

exports.getKpiOverview = async (req, res) => {
  try {
    // ---------- 1. Time calculations ----------
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ---------- 2. Parallel DB queries ----------
    const [
      totalUsers,
      activeUsers24h,
      paidUsers,
      pendingVerifications,
      openReports
    ] = await Promise.all([
      User.countDocuments({
  accountStatus: "active",
  role: "USER"
}),

      User.countDocuments({
        lastLoginAt: { $gte: last24Hours },
        role: "USER",
accountStatus: "active"
      }),

      UserSubscription.countDocuments({
        isActive: true
      }),

      Profile.countDocuments({
        "verification.status": "pending"
      }),

      Report.countDocuments({
        status: { $in: ["new", "in_progress"] }
      })
    ]);

    // ---------- 3. Response formatting for UI ----------
    const response = {
      kpis: {
        totalUsers: {
          value: totalUsers
        },
        activeUsers24h: {
          value: activeUsers24h
        },
        paidUsers: {
          value: paidUsers
        },
        pendingVerifications: {
          value: pendingVerifications,
          actionable: true
        },
        openReports: {
          value: openReports,
          actionable: true,
          severity: openReports > 10 ? "high" : "normal"
        }
      },
      lastUpdatedAt: new Date()
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Admin KPI error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard KPIs"
    });
  }
};

// exports.getKpiOverview = async (req, res) => {
//   const CACHE_KEY = "admin:kpi:overview";
//   const CACHE_TTL = 60; // seconds

//   try {
//     // 1️⃣ Try Redis first
//     if (redis) {
//       const cachedData = await redis.get(CACHE_KEY);
//       if (cachedData) {
//         return res.json({
//           success: true,
//           data: JSON.parse(cachedData),
//           source: "cache"
//         });
//       }
//     }

//     // 2️⃣ Cache miss → calculate from DB
//     const now = new Date();
//     const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

//     const [
//       totalUsers,
//       activeUsers24h,
//       paidUsers,
//       pendingVerifications,
//       openReports
//     ] = await Promise.all([
//       User.countDocuments({ role: "USER", accountStatus: "active" }),
//       User.countDocuments({
//         role: "USER",
//         accountStatus: "active",
//         lastLoginAt: { $gte: last24Hours }
//       }),
//       User.countDocuments({ role: "USER", isPremium: true }),
//       Profile.countDocuments({ "verification.status": "pending" }),
//       Report.countDocuments({
//         status: { $in: ["new", "in_progress"] }
//       })
//     ]);

//     // 3️⃣ KPI severity logic
//     let openReportsSeverity = "normal";
//     if (openReports >= 20) openReportsSeverity = "critical";
//     else if (openReports >= 5) openReportsSeverity = "warning";

//     const responseData = {
//       kpis: {
//         totalUsers: { value: totalUsers },
//         activeUsers24h: { value: activeUsers24h },
//         paidUsers: { value: paidUsers },
//         pendingVerifications: {
//           value: pendingVerifications,
//           actionable: true
//         },
//         openReports: {
//           value: openReports,
//           actionable: true,
//           severity: openReportsSeverity
//         }
//       },
//       lastUpdatedAt: new Date()
//     };

//     // 4️⃣ Save to Redis
//     if (redis) {
//       await redis.set(
//         CACHE_KEY,
//         JSON.stringify(responseData),
//         "EX",
//         CACHE_TTL
//       );
//     }

//     // 5️⃣ Return response
//     return res.json({
//       success: true,
//       data: responseData,
//       source: "db"
//     });

//   } catch (error) {
//     console.error("Admin KPI error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to load dashboard KPIs"
//     });
//   }
// };



exports.verifyUserProfile = async (req, res) => {
  const adminId = req.user.id;
  const userId = req.params.userId;
  const { action, reason } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Invalid action"
    });
  }

  if (action === "reject" && !reason) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason required"
    });
  }

  const profile = await Profile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({
      success: false,
      message: "Profile not found"
    });
  }

  if (profile.verification.status !== "pending") {
    return res.status(409).json({
      success: false,
      message: `Profile already ${profile.verification.status}`
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
        : "User verification rejected"
  });
};


exports.banUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Ban reason is required"
      });
    }

    if (adminId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot ban yourself"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.banDetails?.isBanned) {
      return res.status(409).json({
        success: false,
        message: "User already banned"
      });
    }

    // const before = { isBanned: false };

    user.banDetails = {
      isBanned: true,
      reason,
      bannedBy: adminId,
      bannedAt: new Date()
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
      message: "User banned successfully"
    });

  } catch (err) {
    console.error("Ban user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to ban user"
    });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    // const { reason } = req.body;

    if (adminId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot unban yourself"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.banDetails?.isBanned) {
      return res.status(409).json({
        success: false,
        message: "User is not banned"
      });
    }

    // const before = { isBanned: true };

    user.banDetails.isBanned = false;
    user.banDetails.unbannedBy = adminId;
    user.banDetails.unbannedAt = new Date();

    // Optional cleanup
    user.banDetails.reason = null;
    user.banDetails.bannedBy = null;
    user.banDetails.bannedAt = null;

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
      message: "User unbanned successfully"
    });

  } catch (err) {
    console.error("Unban user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to unban user"
    });
  }
};


exports.suspendUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    const { reason, durationHours } = req.body;

    if (!reason || !durationHours || durationHours <= 0) {
      return res.status(400).json({
        success: false,
        message: "Reason and valid duration are required"
      });
    }

    if (adminId.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot suspend yourself"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.banDetails?.isBanned) {
      return res.status(409).json({
        success: false,
        message: "User is banned. Cannot suspend."
      });
    }

    if (user.suspensionDetails?.isSuspended) {
      return res.status(409).json({
        success: false,
        message: "User already suspended"
      });
    }

    const suspendUntil = new Date(
      Date.now() + durationHours * 60 * 60 * 1000
    );

    // const before = { isSuspended: false };

    user.suspensionDetails = {
      isSuspended: true,
      reason,
      suspendedBy: adminId,
      suspendedAt: new Date(),
      suspendUntil
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
      message: `User suspended for ${durationHours} hours`
    });

  } catch (err) {
    console.error("Suspend user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to suspend user"
    });
  }
};

const utils = require("../auth/auth.utils")
exports.replyToReport = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required"
      });
    }

    const report = await Report.findById(req.params.reportId)
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    if (!Array.isArray(report.replyHistory)) {
  report.replyHistory = [];
}
   report.replyHistory.push({
  message,
  repliedBy: adminId,
  repliedAt: new Date()
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
    const reporter = await User.findById(report.reporterId)
  .select("email");

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
      message: "Reply sent successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send reply",
      error : err.message
    });
  }
};


exports.updateReportStatus = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { status, notifyUser } = req.body;

    if (!["new", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const report = await Report.findById(req.params.reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
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
      message: "Report status updated"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update report status"
    });
  }
};



exports.getBlockedUsers = async (req, res) => {
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
          total
        }
      }
    });

  } catch (err) {
    console.error("Admin block list error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load block data"
    });
  }
};    


exports.getPendingVerifications = async (req, res, next) => {
  try {
    // Find all profiles with pending verification
    const pendingProfiles = await Profile.aggregate([
      {
        $match: {
          'verification.status': 'pending'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          userId: 1,
          verification: 1,
          'user.email': 1,
          'user.phone': 1,
          'user.createdAt': 1,
          'profilePhoto': 1,
          'fullName': 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    res.json({
      success: true,
      count: pendingProfiles.length,
      data: pendingProfiles
    });
  } catch (error) {
    res.status(500).json({
      success:false,
      message : "Failed to fetch pending verifications"
    })
  }
};