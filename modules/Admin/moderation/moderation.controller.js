/* eslint-disable no-unused-vars */
// controllers/admin/admin.kpi.controller.js
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const Report = require("../../profile/user.report");
const redis = require("../../../config/cache");
const Block = require("../../profile/user.block");
const utils = require("../../auth/auth.utils");
const notificationService = require("../../notifications/notification.service");
const {
  NOTIFICATION_TYPES,
} = require("../../notifications/notification.enums");
const mongoose = require("mongoose");
const { reportReviewEmailTemplate } = require("../../../common/utils/reportReviewEmailTemplate");
const { reportResolutionEmailTemplate } = require("../../../common/utils/reportResolutionEmailTemplate");

module.exports.verifyUserProfile = async (req, res) => {
  try {
    const adminId = req.user._id;
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

    // Allow approval if status is pending OR if it was previously rejected (Re-approve)
    const isReApprove =
      action === "approve" && profile.verification.status === "rejected";

    if (profile.verification.status !== "pending" && !isReApprove) {
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

      if (!profile.onboarding) profile.onboarding = {};
      profile.onboarding.isComplete = true;
    } else {
      profile.verification.status = "rejected";
      profile.verification.verifiedBy = adminId;
      profile.verification.verifiedAt = new Date();
      profile.verification.rejectionReason = reason;

      if (!profile.onboarding) profile.onboarding = {};
      if (profile.onboarding.isComplete !== true) {
        profile.onboarding.isComplete = false;
      }
    }

    await profile.save();

    // Audit log (Push to User model)
    const user = await User.findById(userId);
    if (user) {
      user.auditLogs.push({
        action:
          action === "approve"
            ? isReApprove
              ? "re-approve"
              : "approve"
            : "reject",
        reason:
          action === "reject"
            ? reason
            : isReApprove
              ? reason
              : "Identity verified",
        actedBy: adminId,
        actedAt: new Date(),
        details: {
          type: "identity_verification",
          isReApprove: isReApprove,
        },
      });
      await user.save();
    }

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

    // 🔔 Send Push Notification to User
    try {
      if (action === "approve") {
        await notificationService.sendAdminNotification({
          userId,
          title: "Identity Verified! ✅",
          message:
            "Congratulations! Your account has been verified. You can now access all features.",
          data: {
            type: NOTIFICATION_TYPES.KYC_VERIFIED,
            cta: { action: "NAVIGATE_HOME" },
          },
        });
      } else {
        await notificationService.sendAdminNotification({
          userId,
          title: "Verification Rejected ❌",
          message: `Your identity verification was rejected. Reason: ${reason}`,
          data: {
            type: NOTIFICATION_TYPES.KYC_REJECTED,
            cta: { action: "NAVIGATE_HOME" },
          },
        });
      }
    } catch (notifErr) {
      console.error("KYC Notification error (Non-blocking):", notifErr);
    }

    return res.json({
      success: true,
      message:
        action === "approve"
          ? "User verified successfully"
          : "User verification rejected",
    });
  } catch (err) {
    console.error("Verify user profile error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify user profile",
    });
  }
};

module.exports.banUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    const { reason, category } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Ban reason is required",
      });
    }

    if (adminId.toString() === userId.toString()) {
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

    // Push to auditLogs
    user.auditLogs.push({
      action: "ban",
      reason,
      actedBy: adminId,
      actedAt: new Date(),
      details: { category: category || "General" },
    });
    await user.save();

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
    const { reason, category } = req.body;

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
      isBanned: false,
      reason: null,
      bannedBy: null,
      bannedAt: null,
    };

    user.accountStatus = "active";
    await user.save();

    user.auditLogs.push({
      action: "unban",
      reason: reason || "Unbanned by admin",
      actedBy: adminId,
      actedAt: new Date(),
      details: { category: category || "Administrative" },
    });
    await user.save();

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

    if (durationHours < 0 || durationHours > 168) {
      return res.status(400).json({
        success: false,
        message: "Suspension duration must be between 0 and 168 hours (max 7 days)",
      });
    }

    if (adminId.toString() === userId.toString()) {
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

    // Push to auditLogs
    user.auditLogs.push({
      action: "suspend",
      reason,
      actedBy: adminId,
      actedAt: new Date(),
      details: { durationHours, suspendUntil },
    });
    await user.save();

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

module.exports.unsuspendUser = async (req, res) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    const { reason, category } = req.body;

    if (adminId.toString() === userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot unsuspend yourself",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      !user.suspensionDetails?.isSuspended &&
      user.accountStatus !== "suspended"
    ) {
      return res.status(400).json({
        success: false,
        message: "User is not suspended",
      });
    } // Reset suspension details

    user.suspensionDetails = {
      isSuspended: false,
      reason: null,
      suspendedBy: null,
      suspendedAt: null,
      suspendUntil: null,
    };

    user.accountStatus = "active";

    // Push to auditLogs
    user.auditLogs.push({
      action: "unsuspend",
      reason: reason || "Suspension lifted by admin",
      actedBy: adminId,
      actedAt: new Date(),
      details: { category: category || "Administrative" },
    });
    await user.save(); // Cache invalidation

    if (redis) {
      await redis.del("admin:kpi:overview");
      await redis.del(`user:${userId}`);
    }

    return res.json({
      success: true,
      message: "User unsuspended successfully",
    });
  } catch (err) {
    console.error("Unsuspend user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to unsuspend user",
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
        reportReviewEmailTemplate(message),
      );
    } else {
      console.log(
        `Report reply skipped email: reporter ${report.reporterId} has no email`,
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

      if (notifyUser) {
        const reporter = await User.findById(report.reporterId).select("email");
        if (reporter?.email) {
          await utils.sendEmail(
            reporter.email,
            "Your report has been resolved",
            reportResolutionEmailTemplate("Thanks for reporting. We have taken appropriate action."),
          );
        }
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

module.exports.getPendingVerifications = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limitNum = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limitNum;
    const { search, sortBy, status } = req.query;

    // 1. DYNAMIC SORTING
    let sortQuery = { createdAt: -1 };
    if (sortBy === "oldest") sortQuery = { createdAt: 1 };
    if (sortBy === "alphabetical") sortQuery = { nickname: 1 };

    // 2. DYNAMIC MATCHING
    const baseMatchStage = { "user.role": "USER", "user.isFake": { $ne: true } };
    const dataMatchStage = { "user.role": "USER", "user.isFake": { $ne: true } };

    if (status && status !== "all") {
      dataMatchStage["verification.status"] = status;
    }

    if (search) {
      const searchOr = [
        { nickname: { $regex: search, $options: "i" } },
        { "user.email": { $regex: search, $options: "i" } },
        { "user.phone": { $regex: search, $options: "i" } },
      ];
      baseMatchStage.$or = searchOr;
      dataMatchStage.$or = searchOr;
    }

    const pipeline = [
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
        $lookup: {
          from: "profiles",
          localField: "userId",
          foreignField: "userId",
          as: "profileDetails",
        },
      },
      {
        $unwind: { path: "$profileDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $facet: {
          kpiStats: [
            { $match: baseMatchStage },
            {
              $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                not_started: {
                  $sum: {
                    $cond: [
                      { $eq: ["$verification.status", "not_started"] },
                      1,
                      0,
                    ],
                  },
                },
                approved: {
                  $sum: {
                    $cond: [
                      { $eq: ["$verification.status", "approved"] },
                      1,
                      0,
                    ],
                  },
                },
                pending: {
                  $sum: {
                    $cond: [{ $eq: ["$verification.status", "pending"] }, 1, 0],
                  },
                },
                rejected: {
                  $sum: {
                    $cond: [
                      { $eq: ["$verification.status", "rejected"] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          metadata: [{ $match: dataMatchStage }, { $count: "total" }],
          data: [
            { $match: dataMatchStage },
            { $sort: sortQuery },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                userId: 1,
                verification: 1,
                nickname: 1,
                createdAt: 1,
                user: {
                  email: "$user.email",
                  phone: "$user.phone",
                  nickname: "$profileDetails.nickname",
                  avatar: { $arrayElemAt: ["$profileDetails.photos.url", 0] },
                },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Profile.aggregate(pipeline);

    // Extraction with fallbacks
    const statsData = result?.kpiStats?.[0] || {
      totalRequests: 0,
      not_started: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    };
    const { _id, ...kpiStatsWithoutId } = statsData; // Yeh line _id ko remove kar degi

    const totalFiltered = result?.metadata?.[0]?.total || 0;
    const finalData = result?.data || [];

    res.status(200).json({
      success: true,
      pagination: {
        total: totalFiltered,
        page,
        limit: limitNum,
        totalPages: Math.ceil(totalFiltered / limitNum),
      },
      kpiStats: kpiStatsWithoutId,
      data: finalData,
    });
  } catch (error) {
    console.error("KYC Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
