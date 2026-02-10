const Profile = require("../../../modules/profile/profile.model");
const User = require("../../../modules/auth/auth.model");
const {
  formatProfileResponse,
} = require("../../../modules/profile/profile.formatter");
const Report = require("../../../modules/profile/user.report");

const getProfileForReview = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user and profile with all necessary data
    const [user, profile, reports] = await Promise.all([
      User.findById(userId).lean(),
      Profile.findOne({ userId }).lean(),
      Report.find({ reportedId: userId, status: "new" })
        // .populate('reportedBy', 'name email phone')
        .lean(),
    ]);
    // console.log(reports)
    if (!user || !profile) {
      return res.status(404).json({
        success: false,
        message: "User or profile not found",
      });
    }

    const response = {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      accountStatus: user.accountStatus,
      isVerified: user.isVerified,
      isBanned: user.banDetails?.isBanned || false,
      banReason: user.banDetails?.reason || null,
      banDetails: user.banDetails || {},

      profile: {
        nickname: profile.nickname,
        photos: profile?.photos || [],
        bio: profile.about,
        interests: profile.interests || [],
        gender: profile.gender,
        age: profile.age,
        dob: profile.dob,
        location: profile?.location || {},
        verification: profile?.verification || {},
        createdAt: profile.createdAt,
        lastActive: user.lastActive || null,
        deviceInfo: user.deviceInfo || {},
      },

      reports: reports.map((report) => ({
        _id: report._id,
        reason: report.reason,
        details: report.details,
        reportedBy: report.reportedBy,
        createdAt: report.createdAt,
      })),

      reportCount: reports.length,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching profile for review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile for review",
      error: error.message,
    });
  }
};

// const updateProfileStatus = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { action, reason, banDuration } = req.body;
//     const adminId = req.user?._id;

//     if (!["approve", "reject", "ban"].includes(action)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid action. Must be one of: approve, reject, ban",
//       });
//     }

//     if ((action === "reject" || action === "ban") && !reason) {
//       return res.status(400).json({
//         success: false,
//         message: "Reason is required for this action",
//       });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // let update = {};
//     let message = "";

//     switch (action) {
//       case "approve":
//         // Mark all reports as reviewed
//         await Report.updateMany(
//           { reportedId: userId, status: "new" },
//           {
//             $set: {
//               status: "resolved",
//               resolvedAt: new Date(),
//               resolvedBy: adminId,
//               resolution: "Profile approved after review",
//             },
//           }
//         );
//         await User.updateMany(
//           { accountStatus: "banned", "banDetails.isBanned": true },
//           {
//             $set: {
//               accountStatus: "active",
//               "banDetails.isBanned": false,
//               "banDetails.reason": "",
//               "banDetails.bannedAt": null,
//             },
//           }
//         );
//         message = "Profile approved successfully";
//         break;

//       case "reject":
//         // Mark all reports as reviewed
//         await Report.updateMany(
//           { reportedId: userId, status: "new" },
//           {
//             $set: {
//               status: "resolved",
//               resolvedAt: new Date(),
//               resolvedBy: adminId,
//               resolution: "Profile rejected: " + reason,
//             },
//           }
//         );
//         message = "Profile rejected successfully";
//         break;

//       case "ban": {
//         const banDetails = {
//           isBanned: true,
//           reason,
//           bannedBy: adminId,
//           bannedAt: new Date(),
//           banExpiresAt: banDuration
//             ? new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000)
//             : null, // Permanent ban if no duration
//         };

//         await User.findByIdAndUpdate(userId, {
//           $set: {
//             banDetails: banDetails,
//             accountStatus: "banned",
//           },
//         });

//         // Mark all reports as reviewed
//         await Report.updateMany(
//           { reportedId: userId, status: "new" },
//           {
//             $set: {
//               status: "resolved",
//               resolvedAt: new Date(),
//               resolvedBy: adminId,
//               resolution: "User banned: " + reason,
//             },
//           }
//         );

//         message = "User banned successfully";
//         break;
//       }
//     }

//     res.json({
//       success: true,
//       message,
//     });
//   } catch (error) {
//     console.error("Error updating profile status:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update profile status",
//       error: error.message,
//     });
//   }
// };

const updateProfileStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      action,
      reason,
      banDuration,
      suspendDuration,
      replyMessage,
      reportId,
    } = req.body;
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
              resolution: reason || "Profile reviewed and cleared by admin.",
            },
          }
        );
        // Ensure user is active
        user.accountStatus = "active";
        user.banDetails = { isBanned: false };
        await user.save();
        message = "Profile marked as safe and reports resolved.";
        break;

      case "reject":
      case "ban":
        // Permanent or temporary ban
        user.accountStatus = "banned";
        user.banDetails = {
          isBanned: true,
          reason: reason,
          bannedBy: adminId,
          bannedAt: new Date(),
          banExpiresAt: banDuration
            ? new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000)
            : null,
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
              resolution: `User banned: ${reason}`,
            },
          }
        );
        message = `User has been banned.`;
        break;

      case "suspend":
        // Suspension uses suspendDuration in HOURS (based on your frontend input)
        user.accountStatus = "suspended";
        user.banDetails = {
          isBanned: true, // We treat suspension as a temporary ban
          reason: reason,
          bannedBy: adminId,
          bannedAt: new Date(),
          banExpiresAt: new Date(Date.now() + suspendDuration * 60 * 60 * 1000),
        };
        await user.save();
        message = `User suspended for ${suspendDuration} hours.`;
        break;

      case "reply":
        // Specific reply to a single report
        if (!reportId || !replyMessage) {
          return res.status(400).json({
            success: false,
            message: "Report ID and Message are required",
          });
        }

        await Report.findByIdAndUpdate(reportId, {
          $set: {
            adminReply: replyMessage,
            repliedAt: new Date(),
            repliedBy: adminId,
            status: "in_progress", // Moving to in_progress because admin has engaged
          },
        });
        message = "Reply sent to the reporter.";
        break;
    }

    res.json({
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

//     const matchStage = {
//       status: { $in: ["new", "in_progress", "resolved"] },
//       reportedId: { $exists: true, $ne: null },
//     }; // Total count (simple query – correct)

//     const total = await Report.countDocuments(matchStage);

//     const reports = await Report.aggregate([
//       { $match: matchStage }, //  ensure latest report comes first

//       { $sort: { createdAt: -1 } }, // ===== USER LOOKUP (SAFE) =====

//       {
//         $lookup: {
//           from: "users",
//           localField: "reportedId",
//           foreignField: "_id",
//           as: "reportedUser",
//         },
//       },
//       {
//         $unwind: {
//           path: "$reportedUser",
//           preserveNullAndEmptyArrays: true, //  DO NOT DROP DOCS
//         },
//       }, // ===== PROFILE LOOKUP (SAFE) =====

//       {
//         $lookup: {
//           from: "profiles",
//           localField: "reportedUser._id",
//           foreignField: "userId",
//           as: "profile",
//         },
//       },
//       {
//         $unwind: {
//           path: "$profile",
//           preserveNullAndEmptyArrays: true,
//         },
//       }, // ===== GROUP BY REPORTED USER =====

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
//       { $skip: skip },
//       { $limit: limit },
//     ]); // ===== FORMAT RESPONSE =====

//     const result = reports.map((item) => {
//       const user = item.user || {};

//       const profile = item.profile || {
//         nickname: user.name || "No Profile",
//         photos: [],
//         about: "No profile information available",
//         interests: [],
//         gender: user.gender || "Not specified",
//         age: user.age || null,
//         location: {},
//         verification: {},
//       };

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
//           gender: profile.gender || "",
//           age: profile.age || null,
//           location: profile.location || {},
//           verification: profile.verification || {},
//         },

//         reports: item.reports,
//       };
//     });

//     return res.json({
//       success: true,
//       data: result,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || ""; // ✅ Get status filter from frontend

    // Dynamic match stage
    const matchStage = {
      reportedId: { $exists: true, $ne: null },
    };

    // ✅ Apply status filter: if "all" or empty, allow all valid statuses
    if (status && status !== "all") {
      matchStage.status = status;
    } else {
      matchStage.status = { $in: ["new", "in_progress", "resolved"] };
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },

      // Join User data
      {
        $lookup: {
          from: "users",
          localField: "reportedId",
          foreignField: "_id",
          as: "reportedUser",
        },
      },
      { $unwind: { path: "$reportedUser", preserveNullAndEmptyArrays: true } },

      // Join Profile data
      {
        $lookup: {
          from: "profiles",
          localField: "reportedId",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

      // ===== SEARCH FILTER =====
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

      // Group reports by user
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
          reports: {
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
      { $sort: { latestReport: -1 } },
    ];

    // Execute aggregation for data
    const reports = await Report.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
    ]);

    // Calculate total count for pagination (accounts for search & status filter)
    const totalCountResult = await Report.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // ===== FORMAT RESPONSE =====
    const result = reports.map((item) => {
      const user = item.user || {};
      const profile = item.profile || {};

      return {
        userId: item._id,
        nickname: profile.nickname || user.name || "No Nickname",
        profilePhoto: profile.photos?.[0]?.url || null,
        reportCount: item.reportCount,
        lastReportedAt: item.latestReport,
        status: item.latestStatus,
        severity: item.latestSeverity,
        reasons: item.reasons,
        profile: {
          photos: profile.photos || [],
          bio: profile.about || "",
          interests: profile.interests || [],
          gender: profile.gender || user.gender || "",
          age: profile.age || user.age || null,
          location: profile.location || {},
          verification: profile.verification || {},
        },
        reports: item.reports,
      };
    });

    return res.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: result,
    });
  } catch (error) {
    console.error("Error in getReportedProfiles:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reported profiles",
      error: error.message,
    });
  }
};

module.exports = {
  getReportedProfiles,
  getProfileForReview,
  updateProfileStatus,
};
