const Profile = require("../../../modules/profile/profile.model");
const User = require("../../../modules/auth/auth.model");
const { startOfDay, endOfDay, startOfYesterday, endOfYesterday } = require("../../../common/utils/time");
const {
  // eslint-disable-next-line no-unused-vars
  formatProfileResponse,
} = require("../../../modules/profile/profile.formatter");
const Report = require("../../../modules/profile/user.report");
const notificationService = require("../../../modules/notifications/notification.service");

// const getProfileForReview = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Get user and profile with all necessary data
//     const [user, profile, reports] = await Promise.all([
//       User.findById(userId).lean(),
//       Profile.findOne({ userId }).lean(),
//       Report.find({ reportedId: userId })
//         // .populate('reportedBy', 'name email phone')
//         .lean(),
//     ]);

//     // console.log(reports)
//     if (!user || !profile) {
//       return res.status(404).json({
//         success: false,
//         message: "User or profile not found",
//       });
//     }

//     const response = {
//       userId: user._id,
//       email: user.email,
//       phone: user.phone,
//       accountStatus: user.accountStatus,
//       isVerified: user.isVerified,
//       isBanned: user.banDetails?.isBanned || false,
//       banReason: user.banDetails?.reason || null,
//       banDetails: user.banDetails || {},
//       profile: {
//         nickname: profile.nickname,
//         photos: profile?.photos || [],
//         bio: profile.about,
//         interests: profile.interests || [],
//         gender: profile.gender,
//         age: profile.age,
//         dob: profile.dob,
//         location: profile?.location || {},
//         verification: profile?.verification || {},
//         createdAt: profile.createdAt,
//         lastActive: user.lastActive || null,
//         deviceInfo: user.deviceInfo || {},
//       },
//       reports: reports.map((report) => ({
//         _id: report._id,
//         reason: report.reason,
//         details: report.details,
//         reportedBy: report.reportedBy,
//         createdAt: report.createdAt,
//       })),

//       reportCount: reports.length,
//     };

//     res.json({
//       success: true,
//       data: response,
//     });
//   } catch (error) {
//     console.error("Error fetching profile for review:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch profile for review",
//       error: error.message,
//     });
//   }
// };
// const getProfileForReview = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     console.log("userId: ", userId);

//     const [user, profile, reports] = await Promise.all([
//       User.findById(userId)
//         .select(
//           "email phone accountStatus isVerified banDetails lastActive deviceInfo",
//         )
//         .lean(),
//       Profile.findOne({ userId }).lean(),
//       Report.find({ reportedId: userId }).lean(),
//     ]);

//     const reporterIds = [...new Set(reports.map((r) => r.reporterId))];
//     const reporters = await Profile.find({ userId: { $in: reporterIds } })
//       .select("userId nickname")
//       .lean();
//     const reporterMap = reporters.reduce((acc, reporter) => {
//       acc[reporter.userId.toString()] = reporter.nickname;
//       return acc;
//     }, {});

//     if (!user || !profile) {
//       return res.status(404).json({
//         success: false,
//         message: "User or profile not found",
//       });
//     }

//     const response = {
//       userId: user._id,
//       email: user.email,
//       phone: user.phone,
//       accountStatus: user.accountStatus,
//       isVerified: user.isVerified,
//       isBanned: user.banDetails?.isBanned || false,
//       banReason: user.banDetails?.reason || null,
//       banDetails: user.banDetails || {},

//       profile: {
//         nickname: profile.nickname,
//         photos: profile?.photos || [],
//         bio: profile.about,
//         interests: profile.interests || [],
//         gender: profile.gender,
//         age: profile.age,
//         dob: profile.dob,
//         location: profile?.location || {},
//         verification: profile?.verification || {},
//         createdAt: profile.createdAt,
//         lastActive: user.lastActive || null,
//         deviceInfo: user.deviceInfo || {},
//       },

//       reports: reports.map((report) => ({
//         _id: report._id,
//         reason: report.reason,
//         details: report.details,
//         reportedBy: {
//           id: report.reporterId,
//           nickname: reporterMap[report.reporterId.toString()] || "Unknown User",
//           avatar: profile.photos?.[0]?.url || null,
//         },
//         status: report.status,
//         description: report.description,
//         createdAt: report.createdAt,
//       })),

//       reportCount: reports.length,
//     };

//     res.status(200).json({
//       success: true,
//       data: response,
//     });
//   } catch (error) {
//     console.error("Error fetching profile for review:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch profile for review",
//       error: error.message,
//     });
//   }
// };

const getProfileForReview = async (req, res) => {
  try {
    const { userId } = req.params;

    const [user, profile, reports] = await Promise.all([
      User.findById(userId)
        .select(
          "email phone accountStatus isVerified banDetails lastActive deviceInfo",
        )
        .lean(),
      Profile.findOne({ userId }).lean(),
      Report.find({ reportedId: userId }).lean(),
    ]);

    // 2. Reporters ki profiles fetch karein (Nickname + Photos)
    const reporterIds = [
      ...new Set(reports.map((r) => r.reporterId.toString())),
    ];

    // Extract admin IDs from all reply histories and audit logs
    const adminIds = [];
    reports.forEach((r) => {
      r.replyHistory?.forEach((reply) => {
        if (reply.repliedBy) adminIds.push(reply.repliedBy.toString());
      });
    });

    if (user.auditLogs) {
      user.auditLogs.forEach((log) => {
        if (log.actedBy) adminIds.push(log.actedBy.toString());
      });
    }

    const allRelatedUserIds = [...new Set([...reporterIds, ...adminIds])];

    const relatedProfiles = await Profile.find({
      userId: { $in: allRelatedUserIds },
    })
      .select("userId nickname photos")
      .lean();

    // 3. Ek map banayein jisme User (Reporter/Admin) ki details ho
    const profileMap = relatedProfiles.reduce((acc, rep) => {
      acc[rep.userId.toString()] = {
        nickname: rep.nickname,
        avatar: rep.photos?.[0]?.url || null,
      };
      return acc;
    }, {});

    if (!user || !profile) {
      return res
        .status(404)
        .json({ success: false, message: "User or profile not found" });
    }

    // Calculate most common reason
    const reasonCounts = {};
    let mostCommonReason = "N/A";
    let maxCount = 0;

    reports.forEach((report) => {
      if (report.reason) {
        reasonCounts[report.reason] = (reasonCounts[report.reason] || 0) + 1;
        if (reasonCounts[report.reason] > maxCount) {
          maxCount = reasonCounts[report.reason];
          mostCommonReason = report.reason;
        }
      }
    });

    const response = {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      accountStatus: user.accountStatus,
      isVerified: user.isVerified,
      isBanned: user.banDetails?.isBanned || false,
      banDetails: user.banDetails || {},

      profile: {
        nickname: profile.nickname,
        photos: profile.photos?.[0]?.url || null,
        bio: profile.about,
        interests: profile.interests || [],
        gender: profile.gender,
        age: profile.age,
        location: profile.location || {},
        createdAt: profile.createdAt,
        lastActive: user.lastActive,
      },

      reports: reports.map((report) => {
        const reporterData = profileMap[report.reporterId.toString()];
        return {
          _id: report._id,
          reason: report.reason,
          description: report.description,
          details: report.details,
          reportedBy: {
            id: report.reporterId,
            nickname: reporterData?.nickname || "Unknown User",
            avatar: reporterData?.avatar || null,
          },
          status: report.status,
          actionTaken: report.actionTaken,
          replyHistory: (report.replyHistory || []).map((reply) => ({
            ...reply,
            repliedBy: {
              id: reply.repliedBy,
              nickname:
                profileMap[reply.repliedBy?.toString()]?.nickname || "Admin",
            },
          })),
          createdAt: report.createdAt,
          resolvedAt: report.resolvedAt,
        };
      }),

      auditLogs: (user.auditLogs || [])
        .map((log) => ({
          ...log,
          actedBy: {
            id: log.actedBy,
            nickname: profileMap[log.actedBy?.toString()]?.nickname || "Admin",
            avatar: profileMap[log.actedBy?.toString()]?.avatar || null,
          },
        }))
        .sort((a, b) => new Date(b.actedAt) - new Date(a.actedAt)),

      reportCount: reports.length,
      uniqueReporters: reporterIds.length,
      mostCommonReason: mostCommonReason,
    };

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateProfileStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason, suspendDuration, replyMessage, reportId } =
      req.body;
    const adminId = req.user?._id;

    // 1. Expanded validation to include 'suspend', 'resolve', and 'reply'
    const allowedActions = [
      "approve",
      "reject",
      "ban",
      "suspend",
      "resolve",
      "reply",
      "bulk-reply",
    ];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${allowedActions.join(", ")}`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let message = "";
    const auditEntry = {
      action,
      reason,
      actedBy: adminId,
      actedAt: new Date(),
    };

    switch (action) {
      case "approve":
      case "resolve":
        // Mark all 'new' or 'in_progress' reports as resolved and save notes in actionTaken + replyHistory
        await Report.updateMany(
          { reportedId: userId, status: { $in: ["new", "in_progress"] } },
          {
            $set: {
              status: "resolved",
              resolvedAt: new Date(),
              resolvedBy: adminId,
              actionTaken: reason || "Dismissed by Admin",
            },
            $push: {
              replyHistory: {
                message: reason || "Dismissed by Admin",
                repliedBy: adminId,
                repliedAt: new Date(),
              },
            },
          },
        );
        // Ensure user is active — clear both ban and suspension
        user.accountStatus = "active";
        user.banDetails = {
          isBanned: false,
          reason: null,
          bannedBy: null,
          bannedAt: null,
        };
        user.suspensionDetails = {
          isSuspended: false,
          reason: null,
          suspendedBy: null,
          suspendedAt: null,
          suspendUntil: null,
        };
        message = "Profile marked as safe and reports resolved.";
        break;

      case "reject":
      case "ban":
        // Permanent ban
        user.accountStatus = "banned";
        user.banDetails = {
          isBanned: true,
          reason: reason,
          bannedBy: adminId,
          bannedAt: new Date(),
        };

        // Resolve reports with the ban reason
        await Report.updateMany(
          { reportedId: userId, status: { $in: ["new", "in_progress"] } },
          {
            $set: {
              status: "resolved",
              resolvedAt: new Date(),
              resolvedBy: adminId,
              actionTaken: `Banned: ${reason || "Permanent Ban"}`,
            },
          },
        );
        message = `User has been banned.`;
        break;

      case "suspend":
        // Suspension uses suspendDuration in HOURS
        user.accountStatus = "suspended";
        user.suspensionDetails = {
          isSuspended: true,
          reason: reason,
          suspendedBy: adminId,
          suspendedAt: new Date(),
          suspendUntil: new Date(Date.now() + suspendDuration * 60 * 60 * 1000),
        };
        auditEntry.details = { durationHours: suspendDuration };
        message = `User suspended for ${suspendDuration} hours.`;
        break;

      case "reply": {
        // Specific reply to a single report
        if (!reportId || !replyMessage) {
          return res.status(400).json({
            success: false,
            message: "Report ID and Message are required",
          });
        }

        const report = await Report.findById(reportId);
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
          message: replyMessage,
          repliedBy: adminId,
          repliedAt: new Date(),
        });
        report.handledBy = adminId;
        if (report.status === "new") {
          report.status = "in_progress";
        }
        await report.save();

        // Send push notification to the reporter
        try {
          await notificationService.sendAdminNotification({
            userId: report.reporterId,
            title: "Support Update",
            message: replyMessage,
            data: {
              type: "SUPPORT_REPLY",
              reportId: reportId.toString(),
            },
          });
        } catch (pushErr) {
          console.error("Failed to send push notification to reporter:", pushErr);
        }

        // Also add to user audit log for visibility
        auditEntry.details = { reportId, replyMessage };
        message = "Reply sent to the reporter.";
        break;
      }

      case "bulk-reply": {
        // Bulk reply to multiple reports at once (single API call instead of N)
        const { reportIds, replyMessage: bulkMessage } = req.body;

        if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "reportIds (array) and replyMessage are required for bulk-reply",
          });
        }
        if (!bulkMessage) {
          return res.status(400).json({
            success: false,
            message: "replyMessage is required for bulk-reply",
          });
        }

        // Fetch all target reports in a single query
        const reports = await Report.find({
          _id: { $in: reportIds },
          reportedId: userId,
        });

        if (reports.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No matching reports found",
          });
        }

        // Build bulkWrite operations for all reports at once
        const bulkOps = reports.map((report) => ({
          updateOne: {
            filter: { _id: report._id },
            update: {
              $push: {
                replyHistory: {
                  message: bulkMessage,
                  repliedBy: adminId,
                  repliedAt: new Date(),
                },
              },
              $set: {
                handledBy: adminId,
                ...(report.status === "new" ? { status: "in_progress" } : {}),
              },
            },
          },
        }));

        await Report.bulkWrite(bulkOps);

        // Send push notifications concurrently (fire-and-forget, don't block response)
        const notificationPromises = reports.map((report) =>
          notificationService
            .sendAdminNotification({
              userId: report.reporterId,
              title: "Support Update",
              message: bulkMessage,
              data: {
                type: "SUPPORT_REPLY",
                reportId: report._id.toString(),
              },
            })
            .catch((err) =>
              console.error(`Push notification failed for report ${report._id}:`, err)
            )
        );

        // Don't await all notifications - let them complete in background
        Promise.allSettled(notificationPromises).catch(() => { });

        // Save as 'reply' in audit log to pass User model enum validation
        auditEntry.action = "reply";
        auditEntry.details = {
          reportIds,
          replyMessage: bulkMessage,
          count: reports.length,
        };
        message = `Bulk reply sent to ${reports.length} reporters.`;
        break;
      }
    }

    // Push audit entry and save user
    if (action !== "reply" && action !== "bulk-reply") {
      // For reply, we still might want an audit log on the user level
      user.auditLogs.push(auditEntry);
    } else {
      // Optional: Log reply as well in user audit logs
      user.auditLogs.push(auditEntry);
    }
    if (user.auditLogs.length > 100) user.auditLogs = user.auditLogs.slice(-100);
    await user.save();

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error updating profile status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getReportedProfiles = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";

    // 1. Resolve Date Range (Matches Dashboard & Ghosting Logic)
    const presetParam = req.query.preset;
    const fromQuery = req.query.from || req.query.startDate;
    const toQuery = req.query.to || req.query.endDate;

    let startDate, endDate;
    const now = new Date();

    // "today"/"yesterday" calendar boundaries are resolved against
    // Australia/Sydney (APP_TZ), not server-local/UTC time — see common/utils/time.js.
    if (presetParam === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (presetParam === "yesterday") {
      startDate = startOfYesterday();
      endDate = endOfYesterday();
    } else if (presetParam === "last7") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
    } else if (presetParam === "last30") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
    } else if (fromQuery || toQuery) {
      if (fromQuery) {
        startDate = new Date(fromQuery);
      }
      if (toQuery) {
        endDate = new Date(toQuery);
      }
    }

    // 2. Initial Match Stage (Basic filter)
    const baseMatch = { reportedId: { $exists: true, $ne: null } };
    if (startDate || endDate) {
      baseMatch.createdAt = {};
      if (startDate) {
        baseMatch.createdAt.$gte = startDate;
      }
      if (endDate) {
        baseMatch.createdAt.$lte = endDate;
      }
    }

    // 2. Common Pipeline Stages (Group first, then filter by latest status)
    const commonPipeline = [
      { $match: baseMatch },
      // Sort by newest first so that $first in $group picks the latest report
      { $sort: { createdAt: -1 } },
      // Grouping logic to get unique reported users
      {
        $group: {
          _id: "$reportedId",
          reportCount: { $sum: 1 },
          reasons: { $addToSet: "$reason" },
          latestReport: { $first: "$createdAt" },
          latestResolvedAt: { $max: "$resolvedAt" },
          latestStatus: { $first: "$status" },
          latestSeverity: { $first: "$severity" },
          latestUpdatedAt: { $max: "$updatedAt" },
          // Track resolved vs new counts to derive dynamic severity
          resolvedCount: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          newCount: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
          allReports: {
            $push: {
              _id: "$_id",
              reason: "$reason",
              description: "$description",
              status: "$status",
              severity: "$severity",
              reportedById: "$reporterId",
              reportedAt: "$createdAt",
            },
          },
        },
      },
      {
        $addFields: {
          /**
           * Dynamic Severity Rules:
           *   HIGH  → newCount >= 5  (5+ reports still "new", regardless of resolved ones)
           *   LOW   → 5+ total reports, some resolved + some new but < 5 new remaining
           *   else  → keep original latestSeverity from DB
           */
          latestSeverity: {
            $switch: {
              branches: [
                // 5+ new reports pending action → HIGH (even if some are already resolved)
                {
                  case: { $gte: ["$newCount", 5] },
                  then: "high",
                },
                // Has 5+ total, some resolved, some still open but < 5 new → LOW
                {
                  case: {
                    $and: [
                      { $gte: ["$reportCount", 5] },
                      { $gt: ["$resolvedCount", 0] },
                      { $gt: ["$newCount", 0] },
                    ],
                  },
                  then: "low",
                },
              ],
              default: "$latestSeverity",
            },
          },
          // High priority = 5+ reports still in "new" status
          hasHighPriority: {
            $cond: [{ $gte: ["$newCount", 5] }, 1, 0],
          },
        },
      },
      // Filter by the representative status of the user (based on their latest report)
      ...(status === "high"
        ? [{ $match: { hasHighPriority: 1 } }]
        : status && status !== "all"
          ? [{ $match: { latestStatus: status } }]
          : []),
      // Join User & Profile for Search/Display (Done after grouping for efficiency)
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "reportedUser",
        },
      },
      { $unwind: { path: "$reportedUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      // Search Filter
      ...(search
        ? [
          {
            $match: {
              $or: [
                { "profile.nickname": { $regex: search, $options: "i" } },
                { "reportedUser.name": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
        : []),
    ];

    // 3. Execution using $facet
    const [aggResult] = await Report.aggregate([
      {
        $facet: {
          // Actual Data with Pagination
          data: [
            ...commonPipeline,
            { $sort: status === "resolved" ? { latestResolvedAt: -1 } : { latestReport: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          // Filtered Total (Pagination ke liye)
          metadata: [...commonPipeline, { $count: "total" }],
          // Global KPI Stats (Unique Users ke basis par)
          kpiStats: [
            { $match: baseMatch },
            { $sort: { createdAt: -1 } },
            {
              // Mirror commonPipeline: track resolvedCount + newCount for same severity logic
              $group: {
                _id: "$reportedId",
                reportCount: { $sum: 1 },
                status: { $first: "$status" },
                resolvedCount: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
                newCount: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
              },
            },
            {
              // HIGH: 5+ reports still in "new" status (mirrors commonPipeline logic)
              $addFields: {
                hasHighPriority: {
                  $cond: [{ $gte: ["$newCount", 5] }, 1, 0],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                newCount: {
                  $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] },
                },
                inProgressCount: {
                  $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
                },
                resolvedCount: {
                  $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
                },
                highPriorityCount: {
                  $sum: "$hasHighPriority",
                },
              },
            },
          ],
        },
      },
    ]);

    // 4. Data Extraction
    const reports = aggResult.data || [];
    const totalFiltered = aggResult.metadata[0]?.total || 0;
    const stats = aggResult.kpiStats[0] || {
      total: 0,
      newCount: 0,
      inProgressCount: 0,
      resolvedCount: 0,
      highPriorityCount: 0,
    };

    // 5. Format Response
    const formattedData = reports.map((item) => {
      // Calculate unique reporters
      const uniqueReporters = new Set(
        item.allReports.map((r) => r.reportedById?.toString()),
      ).size;

      const reasonCounts = {};
      let mostCommonReason = "N/A";
      let maxCount = 0;
      item.allReports.forEach((r) => {
        if (r.reason) {
          reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
          if (reasonCounts[r.reason] > maxCount) {
            maxCount = reasonCounts[r.reason];
            mostCommonReason = r.reason;
          }
        }
      });

      return {
        userId: item._id,
        nickname:
          item.profile?.nickname || item.reportedUser?.name || "Unknown",
        profilePhoto: item.profile?.photos?.[0]?.url || null,
        reportCount: item.reportCount,
        uniqueReporters,
        mostCommonReason,
        lastReportedAt: item.latestReport,
        status: item.latestStatus,
        severity: item.latestSeverity,
        reasons: item.reasons,
        profile: {
          photos: item.profile?.photos || [],
          bio: item.profile?.about || "",
          gender: item.profile?.gender || "",
          age: item.profile?.age || null,
          location: item.profile?.location || {},
          verification: item.profile?.verification || {},
        },
        reports: item.allReports,
      };
    });

    return res.status(200).json({
      success: true,
      pagination: {
        total: totalFiltered,
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit),
      },
      kpiStats: {
        totalReports: stats.total,
        newReports: stats.newCount,
        inProgressReports: stats.inProgressCount,
        resolvedReports: stats.resolvedCount,
        highPriorityReports: stats.highPriorityCount,
      },
      data: formattedData,
    });
  } catch (error) {
    console.error("getReportedProfiles Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getReportedProfiles,
  getProfileForReview,
  updateProfileStatus,
};
