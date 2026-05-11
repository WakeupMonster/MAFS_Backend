const Profile = require("../../../modules/profile/profile.model");
const User = require("../../../modules/auth/auth.model");
const {
  // eslint-disable-next-line no-unused-vars
  formatProfileResponse,
} = require("../../../modules/profile/profile.formatter");
const Report = require("../../../modules/profile/user.report");

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
    const reporterProfiles = await Profile.find({
      userId: { $in: reporterIds },
    })
      .select("userId nickname photos")
      .lean();

    // 3. Ek map banayein jisme Reporter ki details ho
    const reporterMap = reporterProfiles.reduce((acc, rep) => {
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
        const reporterData = reporterMap[report.reporterId.toString()];
        return {
          _id: report._id,
          reason: report.reason,
          details: report.details,
          reportedBy: {
            id: report.reporterId,
            // Safe checking here to prevent crash
            nickname: reporterData?.nickname || "Unknown User",
            avatar: reporterData?.avatar || null,
          },
          status: report.status,
          actionTaken: report.actionTaken,
          replyHistory: report.replyHistory || [],
          createdAt: report.createdAt,
          resolvedAt: report.resolvedAt,
        };
      }),

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

    switch (action) {
      case "approve":
      case "resolve":
        // Mark all 'new' or 'in_progress' reports as resolved
        await Report.updateMany(
          { reportedId: userId, status: { $in: ["new", "in_progress"] } },
          {
            $set: {
              status: "resolved",
              resolvedAt: new Date(),
              resolvedBy: adminId,
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
        await user.save();
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
        await user.save();

        // Resolve reports with the ban reason
        await Report.updateMany(
          { reportedId: userId, status: { $in: ["new", "in_progress"] } },
          {
            $set: {
              status: "resolved",
              resolvedAt: new Date(),
              resolvedBy: adminId,
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
        await user.save();
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
        message = "Reply sent to the reporter.";
        break;
      }
    }

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

// const getReportedProfiles = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const search = req.query.search || "";
//     const status = req.query.status || ""; // ✅ Get status filter from frontend

//     // Dynamic match stage
//     const matchStage = { reportedId: { $exists: true, $ne: null } };

//     // ✅ Apply status filter: if "all" or empty, allow all valid statuses
//     if (status && status !== "all") {
//       matchStage.status = status;
//     } else {
//       matchStage.status = { $in: ["new", "in_progress", "resolved"] };
//     }

//     const pipeline = [
//       { $match: matchStage },
//       { $sort: { createdAt: -1 } },

//       // Join User data
//       {
//         $lookup: {
//           from: "users",
//           localField: "reportedId",
//           foreignField: "_id",
//           as: "reportedUser",
//         },
//       },
//       { $unwind: { path: "$reportedUser", preserveNullAndEmptyArrays: true } },

//       // Join Profile data
//       {
//         $lookup: {
//           from: "profiles",
//           localField: "reportedId",
//           foreignField: "userId",
//           as: "profile",
//         },
//       },
//       { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

//       // ===== SEARCH FILTER =====
//       ...(search
//         ? [
//             {
//               $match: {
//                 $or: [
//                   { "profile.nickname": { $regex: search, $options: "i" } },
//                   { "reportedUser.name": { $regex: search, $options: "i" } },
//                 ],
//               },
//             },
//           ]
//         : []),

//       // Group reports by user
//       {
//         $group: {
//           _id: "$reportedId",
//           user: { $first: "$reportedUser" },
//           profile: { $first: "$profile" },
//           reportCount: { $sum: 1 },
//           reasons: { $addToSet: "$reason" },
//           latestReport: { $first: "$createdAt" },
//           latestStatus: { $first: "$status" },
//           latestSeverity: { $first: "$severity" },
//           reports: {
//             $push: {
//               _id: "$_id",
//               reason: "$reason",
//               description: "$description",
//               status: "$status",
//               severity: "$severity",
//               reportedById: "$reporterId",
//               reportedAt: "$createdAt",
//             },
//           },
//         },
//       },
//       { $sort: { latestReport: -1 } },
//     ];

//     // Execute aggregation for data and stats
//     const [aggResult] = await Report.aggregate([
//       {
//         $facet: {
//           data: [...pipeline, { $skip: skip }, { $limit: limit }],
//           totalCount: [...pipeline, { $count: "total" }],
//           kpiStats: [
//             { $match: { reportedId: { $exists: true, $ne: null } } },
//             {
//               $group: {
//                 _id: "$reportedId",
//                 status: { $first: "$status" },
//                 severity: { $first: "$severity" },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 total: { $sum: 1 },
//                 newCount: {
//                   $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] },
//                 },
//                 inProgressCount: {
//                   $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
//                 },
//                 resolvedCount: {
//                   $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
//                 },
//                 highPriorityCount: {
//                   $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] },
//                 },
//               },
//             },
//           ],
//         },
//       },
//     ]);

//     const reports = aggResult.data || [];
//     const total = aggResult.totalCount[0]?.total || 0;
//     const stats = aggResult.kpiStats[0] || {
//       total: 0,
//       newCount: 0,
//       inProgressCount: 0,
//       resolvedCount: 0,
//       highPriorityCount: 0,
//     };

//     const kpiStats = {
//       totalReports: stats.total,
//       newReports: stats.newCount,
//       inProgressReports: stats.inProgressCount,
//       resolvedReports: stats.resolvedCount,
//       highPriorityReports: stats.highPriorityCount,
//     };

//     // ===== FORMAT RESPONSE =====
//     const formattedData = reports.map((item) => {
//       const user = item.user || {};
//       const profile = item.profile || {};

//       return {
//         userId: item._id,
//         nickname: profile.nickname || user.name || "No Nickname",
//         profilePhoto: profile.photos?.[0]?.url || null,
//         reportCount: item.reportCount,
//         lastReportedAt: item.latestReport,
//         status: item.latestStatus,
//         severity: item.latestSeverity,
//         reasons: item.reasons,
//         profile: {
//           photos: profile.photos || [],
//           bio: profile.about || "",
//           interests: profile.interests || [],
//           gender: profile.gender || user.gender || "",
//           age: profile.age || user.age || null,
//           location: profile.location || {},
//           verification: profile.verification || {},
//         },
//         reports: item.reports,
//       };
//     });

//     return res.json({
//       success: true,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//       kpiStats,
//       data: formattedData,
//     });
//   } catch (error) {
//     console.error("Error in getReportedProfiles:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch reported profiles",
//       error: error.message,
//     });
//   }
// };

const getReportedProfiles = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";

    // 1. Initial Match Stage (Basic filter)
    const baseMatch = { reportedId: { $exists: true, $ne: null } };

    // 2. Status & Severity Filter Logic
    const statusMatch = {};
    if (status === "high") {
      statusMatch.severity = "high";
    } else if (status && status !== "all") {
      statusMatch.status = status;
    } else {
      statusMatch.status = { $in: ["new", "in_progress", "resolved"] };
    }

    // 3. Common Pipeline Stages (Jo Data aur Count dono mein use honge)
    const commonPipeline = [
      { $match: { ...baseMatch, ...statusMatch } },
      // Join User & Profile for Search
      {
        $lookup: {
          from: "users",
          localField: "reportedId",
          foreignField: "_id",
          as: "reportedUser",
        },
      },
      { $unwind: { path: "$reportedUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "reportedId",
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
      // Grouping logic to get unique reported users
      {
        $group: {
          _id: "$reportedId",
          user: { $first: "$reportedUser" },
          profile: { $first: "$profile" },
          reportCount: { $sum: 1 },
          reasons: { $addToSet: "$reason" },
          latestReport: { $first: "$createdAt" },
          latestStatus: { $first: "$status" },
          latestSeverity: { $first: "$severity" },
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
    ];

    // 4. Execution using $facet
    const [aggResult] = await Report.aggregate([
      {
        $facet: {
          // Actual Data with Pagination
          data: [
            ...commonPipeline,
            { $sort: { latestReport: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          // Filtered Total (Pagination ke liye)
          metadata: [...commonPipeline, { $count: "total" }],
          // Global KPI Stats (Unique Users ke basis par)
          kpiStats: [
            { $match: baseMatch }, // Global stats ke liye search/status filter nahi lagaya
            {
              $group: {
                _id: "$reportedId",
                status: { $first: "$status" },
                severity: { $first: "$severity" },
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
                  $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ]);

    // 5. Data Extraction
    const reports = aggResult.data || [];
    const totalFiltered = aggResult.metadata[0]?.total || 0;
    const stats = aggResult.kpiStats[0] || {
      total: 0,
      newCount: 0,
      inProgressCount: 0,
      resolvedCount: 0,
      highPriorityCount: 0,
    };

    // 6. Format Response
    const formattedData = reports.map((item) => {
      // Calculate unique reporters and most common reason for this user
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
        nickname: item.profile?.nickname || item.user?.name || "Unknown",
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

    return res.json({
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
