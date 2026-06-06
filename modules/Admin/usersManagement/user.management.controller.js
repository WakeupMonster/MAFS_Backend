const mongoose = require("mongoose");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const { updateUserSchema } = require("./user.management.validation");
const { stringify } = require("csv-stringify");
const { destroy } = require("../../upload/cloudinary.service");
const { calculateAge } = require("../../../common/utils/calculate.age");
const {
  getSafeAgePipeline,
  resolveDatePreset,
  mapNestedProfileUpdates,
} = require("./user.management.helpers");
const UsageService = require("../../subscription/services/usage.service");

/*
For Data Table & Search or filters:- 
API 1: GET api/v1/admin/user-management/user-list

For GET View Single User details:-
API 2: GET api/v1/admin/user-management/:userId

For Update Single User Detail:- 
API 3: PATCH api/v1/admin/user-management/:userId 
------ PATCH api/v1/admin/user-management/:userId/status

For Bluk exports to get all Users Data:- 
API 4: POST api/v1/admin/user-management/export
*/

/* ========: GET ALL USERS – ADMIN DATATABLE (REDIS) & Search or filters:API 1: GET api/v1/admin/user-management/user-list ====== */
// module.exports.GETAllUsers = async (req, res) => {
//   try {
//     const {
//       page: reqPage,
//       limit: reqLimit,
//       search,
//       accountStatus,
//       isPremium,
//       isBanned,
//       last24Hours,
//       gender,
//       isDeactivated,
//       isScheduledForDeletion,
//       isGhosting,
//       preset,
//       from,
//       to,
//     } = req.query;

//     const page = Math.max(parseInt(reqPage) || 1, 1);
//     const limit = Math.min(parseInt(reqLimit) || 10, 100);
//     const skip = (page - 1) * limit;
//     const searchTrimmed = search?.trim();

//     const baseMatch = { role: "USER", isFake: { $ne: true } };

//     // --- GHOSTING FILTER LOGIC (Dynamic inactivity threshold aligned with dashboard) ---
//     if (isGhosting === "true") {
//       let thresholdDate;
//       if (preset === "last7") {
//         thresholdDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//       } else if (preset === "last30") {
//         thresholdDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//       } else if (preset === "last90") {
//         thresholdDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
//       } else if (preset === "custom" && from) {
//         thresholdDate = new Date(from);
//       } else {
//         // Default fallback (including "today" and "yesterday" presets): 2 months inactivity
//         thresholdDate = new Date();
//         thresholdDate.setMonth(thresholdDate.getMonth() - 2);
//       }

//       baseMatch.accountStatus = "active";
//       baseMatch.createdAt = { $lt: thresholdDate };
//       baseMatch.$or = [
//         { lastLoginAt: { $lt: thresholdDate } },
//         { lastLoginAt: null },
//       ];
//     }

//     if (accountStatus) baseMatch.accountStatus = accountStatus;
//     if (isPremium) baseMatch.isPremium = isPremium === "true";
//     if (isBanned !== undefined)
//       baseMatch["banDetails.isBanned"] = isBanned === "true";
//     if (isDeactivated !== undefined)
//       baseMatch["deactivationDetails.isDeactivated"] = isDeactivated === "true";
//     if (isScheduledForDeletion !== undefined) {
//       baseMatch["deletionDetails.isScheduledForDeletion"] =
//         isScheduledForDeletion === "true";
//     }
//     if (last24Hours === "true") {
//       const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
//       baseMatch.createdAt = { $gte: twentyFourHoursAgo };
//     } else if (isGhosting !== "true") {
//       // General date filtering for other filters (e.g. Female signups from dashboard)
//       if (from && to) {
//         baseMatch.createdAt = { $gte: new Date(from), $lte: new Date(to) };
//       } else if (preset) {
//         // IMPORTANT: Do NOT use now.setHours() — it mutates the Date object.
//         // Create fresh Date instances for each boundary to avoid corruption.
//         const now = new Date();

//         if (preset === "today") {
//           const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
//           const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
//           baseMatch.createdAt = { $gte: startOfToday, $lte: endOfToday };
//         } else if (preset === "yesterday") {
//           const y = new Date(now);
//           y.setDate(y.getDate() - 1);
//           const startOfYesterday = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
//           const endOfYesterday = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
//           baseMatch.createdAt = { $gte: startOfYesterday, $lte: endOfYesterday };
//         } else if (preset === "last7") {
//           const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//           baseMatch.createdAt = { $gte: start, $lte: now };
//         } else if (preset === "last30") {
//           const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
//           baseMatch.createdAt = { $gte: start, $lte: now };
//         } else if (preset === "last90") {
//           const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
//           baseMatch.createdAt = { $gte: start, $lte: now };
//         } else if (preset === "custom" && from) {
//           baseMatch.createdAt = { $gte: new Date(from) };
//         }
//       }
//     }

//     const pipeline = [{ $match: baseMatch }];

//     // OPTIMIZATION: If we need to filter/search by profile fields, we MUST lookup early.
//     // If not, we defer the lookup until AFTER pagination for massive performance gains.
//     const needsEarlyProfileLookup = !!(gender || searchTrimmed);

//     if (needsEarlyProfileLookup) {
//       pipeline.push(
//         {
//           $lookup: {
//             from: "profiles",
//             localField: "_id",
//             foreignField: "userId",
//             as: "profile",
//           },
//         },
//         { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
//         getSafeAgePipeline(),
//       );

//       if (gender) {
//         pipeline.push({ $match: { "profile.gender": gender } });
//       }

//       if (searchTrimmed) {
//         const searchRegex = new RegExp(
//           searchTrimmed.replace(/[.*+?^${}()|[\\/]\\]/g, "\\$&"),
//           "i",
//         );
//         const searchConditions = [
//           { email: searchRegex },
//           { phone: searchRegex },
//           { "profile.nickname": searchRegex },
//           { "profile.gender": { $regex: `^${searchTrimmed}$`, $options: "i" } },
//           { "profile.location.city": searchRegex },
//           { "profile.location.country": searchRegex },
//         ];

//         if (!isNaN(parseInt(searchTrimmed))) {
//           searchConditions.push({
//             "profile.calculatedAge": parseInt(searchTrimmed),
//           });
//         }
//         pipeline.push({ $match: { $or: searchConditions } });
//       }
//     }

//     const dataPipeline = [
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit },
//       // If we didn't lookup profiles earlier, we do it now (only for the 10 paginated users!)
//       ...(!needsEarlyProfileLookup
//         ? [
//           {
//             $lookup: {
//               from: "profiles",
//               localField: "_id",
//               foreignField: "userId",
//               as: "profile",
//             },
//           },
//           {
//             $unwind: {
//               path: "$profile",
//               preserveNullAndEmptyArrays: true,
//             },
//           },
//           getSafeAgePipeline(),
//         ]
//         : []),
//       {
//         $project: {
//           _id: 1,
//           role: 1,
//           account: {
//             status: "$accountStatus",
//             isPremium: "$isPremium",
//             phone: "$phone",
//             email: "$email",
//             authMethod: "$authMethod",
//             banDetails: "$banDetails",
//             deactivationDetails: "$deactivationDetails",
//             deletionDetails: "$deletionDetails",
//             suspensionDetails: {
//               $mergeObjects: [
//                 "$suspensionDetails",
//                 {
//                   suspendedByName: {
//                     $ifNull: [
//                       "$suspendedByProfile.nickname",
//                       "$suspendedByProfile.fullName",
//                     ],
//                   },
//                   suspendedByEmail: "$suspendedByUser.email",
//                 },
//               ],
//             },
//             createdAt: "$createdAt",
//           },
//           profile: {
//             profileId: "$profile._id",
//             nickname: "$profile.nickname",
//             dob: "$profile.dob",
//             age: "$profile.calculatedAge",
//             gender: "$profile.gender",
//             height: "$profile.height",
//             about: "$profile.about",
//             jobTitle: "$profile.jobTitle",
//             company: "$profile.company",
//             totalCompletion: "$profile.onboardingProgress.totalCompletion",
//           },
//           location: "$profile.location",
//           photos: { $arrayElemAt: ["$profile.photos.url", 0] },
//           lastProfileUpdate: "$profile.lastProfileUpdate",
//           createdAt: 1,
//           lastLoginAt: 1,
//         },
//       },
//     ];

//     // ── Global KPI Stats (unaffected by search/filter/pagination) ──
//     const globalBase = { role: "USER", isFake: { $ne: true } };
//     const [
//       globalTotal, globalActive, globalPremium, globalBanned, globalSuspended
//     ] = await Promise.all([
//       User.countDocuments(globalBase),
//       User.countDocuments({ ...globalBase, accountStatus: "active" }),
//       User.countDocuments({ ...globalBase, isPremium: true }),
//       User.countDocuments({ ...globalBase, accountStatus: "banned" }),
//       User.countDocuments({ ...globalBase, accountStatus: "suspended" }),
//     ]);

//     // ── Filtered user list + filtered total for pagination ──
//     let users = [];
//     let total = 0;

//     if (!needsEarlyProfileLookup) {
//       const [usersData, t] = await Promise.all([
//         User.aggregate([...pipeline, ...dataPipeline]),
//         User.countDocuments(baseMatch),
//       ]);
//       users = usersData;
//       total = t;
//     } else {
//       const [usersData, t] = await Promise.all([
//         User.aggregate([...pipeline, ...dataPipeline]),
//         User.aggregate([...pipeline, { $count: "count" }]),
//       ]);
//       users = usersData;
//       total = t[0]?.count || 0;
//     }

//     const responseData = {
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//       kpiStats: {
//         totalUsers: globalTotal,
//         activeTotal: globalActive,
//         premiumTotal: globalPremium,
//         bannedTotal: globalBanned,
//         suspendedTotal: globalSuspended,
//       },
//       message: "Users fetched successfully",
//       data: users,
//     };

//     return res.status(200).json({
//       success: true,
//       cached: false,
//       ...responseData,
//     });
//   } catch (error) {
//     console.error("GET USER LIST ERROR:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch users" });
//   }
// };

/* ======: For GET SINGLE USER DETAILS – ADMIN:====API 2: GET api/v1/admin/user-management/:userId =========== */






module.exports.GETAllUsers = async (req, res) => {
  try {
    const {
      page: reqPage,
      limit: reqLimit,
      search,
      accountStatus,
      isPremium,
      isBanned,
      last24Hours,
      gender,
      isDeactivated,
      isScheduledForDeletion,
      isGhosting,
      preset,
      from,
      to,
    } = req.query;

    const page = Math.max(parseInt(reqPage) || 1, 1);
    const limit = Math.min(parseInt(reqLimit) || 10, 100);
    const skip = (page - 1) * limit;
    const searchTrimmed = search?.trim();

    const baseMatch = { role: "USER", isFake: { $ne: true } };

    // --- GHOSTING FILTER LOGIC (Dynamic inactivity threshold aligned with dashboard) ---
    if (isGhosting === "true") {
      let thresholdDate;
      if (preset === "last7") {
        thresholdDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (preset === "last30") {
        thresholdDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      } else if (preset === "last90") {
        thresholdDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      } else if (preset === "custom" && from) {
        thresholdDate = new Date(from);
      } else {
        // Default fallback (including "today" and "yesterday" presets): 2 months inactivity
        thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - 2);
      }

      baseMatch.accountStatus = "active";
      baseMatch.createdAt = { $lt: thresholdDate };
      baseMatch.$or = [
        { lastLoginAt: { $lt: thresholdDate } },
        { lastLoginAt: null },
      ];
    }

    if (accountStatus) baseMatch.accountStatus = accountStatus;
    if (isPremium) baseMatch.isPremium = isPremium === "true";
    if (isBanned !== undefined)
      baseMatch["banDetails.isBanned"] = isBanned === "true";
    if (isDeactivated !== undefined)
      baseMatch["deactivationDetails.isDeactivated"] = isDeactivated === "true";
    if (isScheduledForDeletion !== undefined) {
      baseMatch["deletionDetails.isScheduledForDeletion"] =
        isScheduledForDeletion === "true";
    }
    if (last24Hours === "true") {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      baseMatch.createdAt = { $gte: twentyFourHoursAgo };
    } else if (isGhosting !== "true") {
      // General date filtering for other filters (e.g. Female signups from dashboard)
      if (from && to) {
        baseMatch.createdAt = { $gte: new Date(from), $lte: new Date(to) };
      } else if (preset) {
        // IMPORTANT: Do NOT use now.setHours() — it mutates the Date object.
        // Create fresh Date instances for each boundary to avoid corruption.
        const now = new Date();

        if (preset === "today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          baseMatch.createdAt = { $gte: startOfToday, $lte: endOfToday };
        } else if (preset === "yesterday") {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          const startOfYesterday = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
          const endOfYesterday = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
          baseMatch.createdAt = { $gte: startOfYesterday, $lte: endOfYesterday };
        } else if (preset === "last7") {
          const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          baseMatch.createdAt = { $gte: start, $lte: now };
        } else if (preset === "last30") {
          const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          baseMatch.createdAt = { $gte: start, $lte: now };
        } else if (preset === "last90") {
          const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          baseMatch.createdAt = { $gte: start, $lte: now };
        } else if (preset === "custom" && from) {
          baseMatch.createdAt = { $gte: new Date(from) };
        }
      }
    }

    const pipeline = [{ $match: baseMatch }];

    // OPTIMIZATION: If we need to filter/search by profile fields, we MUST lookup early.
    // If not, we defer the lookup until AFTER pagination for massive performance gains.
    const needsEarlyProfileLookup = !!(gender || searchTrimmed);

    if (needsEarlyProfileLookup) {
      pipeline.push(
        {
          $lookup: {
            from: "profiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        getSafeAgePipeline(),
      );

      if (gender) {
        pipeline.push({ $match: { "profile.gender": gender } });
      }

      if (searchTrimmed) {
        const searchRegex = new RegExp(
          searchTrimmed.replace(/[.*+?^${}()|[\\/]\\]/g, "\\$&"),
          "i",
        );
        const searchConditions = [
          { email: searchRegex },
          { phone: searchRegex },
          { "profile.nickname": searchRegex },
          { "profile.gender": { $regex: `^${searchTrimmed}$`, $options: "i" } },
          { "profile.location.city": searchRegex },
          { "profile.location.country": searchRegex },
        ];

        if (!isNaN(parseInt(searchTrimmed))) {
          searchConditions.push({
            "profile.calculatedAge": parseInt(searchTrimmed),
          });
        }
        pipeline.push({ $match: { $or: searchConditions } });
      }
    }

    const dataPipeline = [
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // If we didn't lookup profiles earlier, we do it now (only for the 10 paginated users!)
      ...(!needsEarlyProfileLookup
        ? [
          {
            $lookup: {
              from: "profiles",
              localField: "_id",
              foreignField: "userId",
              as: "profile",
            },
          },
          {
            $unwind: {
              path: "$profile",
              preserveNullAndEmptyArrays: true,
            },
          },
          getSafeAgePipeline(),
        ]
        : []),
      {
        $project: {
          _id: 1,
          role: 1,
          account: {
            status: "$accountStatus",
            isPremium: "$isPremium",
            phone: "$phone",
            email: "$email",
            authMethod: "$authMethod",
            banDetails: "$banDetails",
            deactivationDetails: "$deactivationDetails",
            deletionDetails: "$deletionDetails",
            suspensionDetails: {
              $mergeObjects: [
                "$suspensionDetails",
                {
                  suspendedByName: {
                    $ifNull: [
                      "$suspendedByProfile.nickname",
                      "$suspendedByProfile.fullName",
                    ],
                  },
                  suspendedByEmail: "$suspendedByUser.email",
                },
              ],
            },
            createdAt: "$createdAt",
          },
          profile: {
            profileId: "$profile._id",
            nickname: "$profile.nickname",
            dob: "$profile.dob",
            age: "$profile.calculatedAge",
            gender: "$profile.gender",
            height: "$profile.height",
            about: "$profile.about",
            jobTitle: "$profile.jobTitle",
            company: "$profile.company",
            totalCompletion: "$profile.onboardingProgress.totalCompletion",
          },
          location: "$profile.location",
          photos: { $arrayElemAt: ["$profile.photos.url", 0] },
          lastProfileUpdate: "$profile.lastProfileUpdate",
          createdAt: 1,
          lastLoginAt: 1,
        },
      },
    ];

    // ── Global KPI Stats (unaffected by search/filter/pagination) ──
    const globalBase = { role: "USER", isFake: { $ne: true } };
    const [
      globalTotal, globalActive, globalPremium, globalBanned, globalSuspended
    ] = await Promise.all([
      User.countDocuments(globalBase),
      User.countDocuments({ ...globalBase, accountStatus: "active" }),
      User.countDocuments({ ...globalBase, isPremium: true }),
      User.countDocuments({ ...globalBase, accountStatus: "banned" }),
      User.countDocuments({ ...globalBase, accountStatus: "suspended" }),
    ]);

    // ── Filtered user list + filtered total for pagination ──
    let users = [];
    let total = 0;

    if (!needsEarlyProfileLookup) {
      const [usersData, t] = await Promise.all([
        User.aggregate([...pipeline, ...dataPipeline]),
        User.countDocuments(baseMatch),
      ]);
      users = usersData;
      total = t;
    } else {
      const [usersData, t] = await Promise.all([
        User.aggregate([...pipeline, ...dataPipeline]),
        User.aggregate([...pipeline, { $count: "count" }]),
      ]);
      users = usersData;
      total = t[0]?.count || 0;
    }

    const responseData = {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpiStats: {
        totalUsers: globalTotal,
        activeTotal: globalActive,
        premiumTotal: globalPremium,
        bannedTotal: globalBanned,
        suspendedTotal: globalSuspended,
      },
      message: "Users fetched successfully",
      data: users,
    };

    return res.status(200).json({
      success: true,
      cached: false,
      ...responseData,
    });
  } catch (error) {
    console.error("GET USER LIST ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};





module.exports.GETSingleUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Validation
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format",
      });
    }

    const uId = new mongoose.Types.ObjectId(userId);

    const Match = mongoose.model("Match");
    const Swipe = mongoose.model("Swipe");
    const Block = mongoose.model("Block");
    const Report = mongoose.model("Report");
    const SubscriptionTransaction = mongoose.model("SubscriptionTransaction");

    // 2. Base Pipeline for lightweight 1-to-1 or embedded lookups
    const basePipeline = [
      { $match: { _id: uId } },
      { $lookup: { from: "profiles", localField: "_id", foreignField: "userId", as: "profile" } },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      getSafeAgePipeline(),
      { $lookup: { from: "accounts", localField: "_id", foreignField: "userId", as: "account" } },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "blockedcontacts", localField: "_id", foreignField: "userId", as: "blockedContactsData" } },
      { $lookup: { from: "subscriptions", localField: "_id", foreignField: "userId", as: "subscriptionInfo" } },
      {
        $addFields: {
          currentSubscription: {
            $arrayElemAt: [
              { $sortArray: { input: { $filter: { input: "$subscriptionInfo", as: "sub", cond: { $in: ["$$sub.status", ["ACTIVE", "CANCELLED", "GRACE", "PENDING"]] } } }, sortBy: { expiresAt: -1 } } }, 0
            ],
          },
          latestSubscription: {
            $arrayElemAt: [{ $sortArray: { input: "$subscriptionInfo", sortBy: { expiresAt: -1 } } }, 0],
          },
        },
      },
      { $lookup: { from: "user_consumable_balances", localField: "_id", foreignField: "userId", as: "consumableBalances" } },
      { $unwind: { path: "$consumableBalances", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "suspensionDetails.suspendedBy", foreignField: "_id", as: "suspendedByUser" } },
      { $unwind: { path: "$suspendedByUser", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "profiles", localField: "suspensionDetails.suspendedBy", foreignField: "userId", as: "suspendedByProfile" } },
      { $unwind: { path: "$suspendedByProfile", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "banDetails.bannedBy", foreignField: "_id", as: "bannedByUser" } },
      { $unwind: { path: "$bannedByUser", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "profiles", localField: "banDetails.bannedBy", foreignField: "userId", as: "bannedByProfile" } },
      { $unwind: { path: "$bannedByProfile", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "profiles", localField: "auditLogs.actedBy", foreignField: "userId", as: "auditAdminProfiles" } }
    ];

    // 3. Parallel fetch of expensive sub-documents using precise indexes
    const [
      baseUserResult,
      swipeStatsResult,
      recentMatches,
      totalMatches,
      blockedUsersData,
      reportsReceived,
      transactionHistory
    ] = await Promise.all([
      User.aggregate(basePipeline),
      Swipe.aggregate([
        { $match: { swiperId: uId } },
        {
          $group: {
            _id: null,
            totalSwipes: { $sum: 1 },
            likes: { $sum: { $cond: [{ $eq: ["$action", "like"] }, 1, 0] } },
            superLikes: { $sum: { $cond: [{ $eq: ["$action", "superlike"] }, 1, 0] } },
            rejections: { $sum: { $cond: [{ $eq: ["$action", "pass"] }, 1, 0] } },
          },
        }
      ]),
      Match.aggregate([
        { $match: { users: uId } },
        { $sort: { matchedAt: -1 } },
        { $limit: 5 },
        {
          $addFields: {
            otherUserId: {
              $first: { $filter: { input: "$users", as: "uid", cond: { $ne: ["$$uid", uId] } } }
            }
          }
        },
        { $lookup: { from: "users", localField: "otherUserId", foreignField: "_id", as: "otherUser" } },
        { $unwind: { path: "$otherUser", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "profiles", localField: "otherUserId", foreignField: "userId", as: "otherProfile" } },
        { $unwind: { path: "$otherProfile", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            matchedAt: 1,
            ouserId: "$otherProfile.userId",
            nickname: "$otherProfile.nickname",
            email: "$otherUser.email",
            age: "$otherProfile.calculatedAge",
            photo: { $arrayElemAt: ["$otherProfile.photos.url", 0] },
          }
        }
      ]),
      Match.countDocuments({ users: uId }),
      Block.aggregate([
        { $match: { blockerId: uId } },
        { $lookup: { from: "users", localField: "blockedId", foreignField: "_id", as: "blockedUserInfo" } },
        { $unwind: { path: "$blockedUserInfo", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "profiles", localField: "blockedId", foreignField: "userId", as: "blockedProfile" } },
        { $unwind: { path: "$blockedProfile", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: "$blockedId",
            nickname: { $ifNull: ["$blockedProfile.nickname", ""] },
            photo: { $arrayElemAt: ["$blockedProfile.photos.url", 0] },
            email: { $ifNull: ["$blockedUserInfo.email", ""] },
            phone: { $ifNull: ["$blockedUserInfo.phone", ""] },
            blockedAt: "$createdAt",
          }
        }
      ]),
      Report.aggregate([
        { $match: { reportedId: uId } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "profiles", localField: "reporterId", foreignField: "userId", as: "reporterInfo" } },
        {
          $project: {
            _id: 1,
            reason: 1,
            type: 1,
            status: 1,
            severity: 1,
            createdAt: 1,
            reporterNickname: { $arrayElemAt: ["$reporterInfo.nickname", 0] },
          }
        }
      ]),
      SubscriptionTransaction.find({ userId: uId }).sort({ createdAt: -1 }).lean()
    ]);

    if (!baseUserResult || baseUserResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const b = baseUserResult[0];
    const s = swipeStatsResult[0] || {};
    const pendingReports = reportsReceived.filter(r => r.status === "new").length;

    // Fetch unified usage data directly from UsageService
    const usageStatus = await UsageService.getUsageStatus(userId);

    // Calculate total available (Quota Remaining + Wallet Balance)
    const skRemaining = usageStatus?.data?.allocations?.superKeens?.remaining;
    const walletSK = usageStatus?.data?.wallet?.superKeens || 0;
    const totalSuperKeens = skRemaining === -1 ? -1 : (Math.max(0, skRemaining || 0) + walletSK);

    const boostRemaining = usageStatus?.data?.allocations?.boosts?.remaining;
    const walletBoosts = usageStatus?.data?.wallet?.boosts || 0;
    const totalBoosts = boostRemaining === -1 ? -1 : (Math.max(0, boostRemaining || 0) + walletBoosts);

    // 4. Construct exact payload
    const finalData = {
      _id: b._id,
      isPhoneVerified: b.isPhoneVerified,
      isEmailVerified: b.isEmailVerified,
      role: b.role,
      lastLoginAt: b.lastLoginAt,
      isMilestoneUser: !!(b.giveaway && (b.giveaway.isEligibleForFreeTrial || b.giveaway.claimedAt)),
      milestoneDisplayStatus: (b.giveaway && b.giveaway.claimedAt) ? "Claimed (Active)" : ((b.giveaway && b.giveaway.isEligibleForFreeTrial) ? "Eligible" : "Not Enrolled"),
      security: {
        currentIp: b.currentIp,
        lastUsedDevice: b.lastUsedDevice,
        activeSessions: b.sessions,
        history: b.loginHistory,
      },
      stats: {
        totalSwipes: s.totalSwipes || 0,
        totalLikes: s.likes || 0,
        totalSuperLikes: s.superLikes || 0,
        totalRejections: s.rejections || 0,
        totalMatches: totalMatches,
        totalTransactions: transactionHistory.length,
        totalReports: reportsReceived.length,
        pendingReports: pendingReports,
        totalSessions: b.sessions ? b.sessions.length : 0,
      },
      reports: reportsReceived,
      recentMatches: recentMatches,
      account: {
        status: b.accountStatus,
        isPremium: b.isPremium,
        phone: b.phone,
        email: b.email,
        authMethod: b.authMethod,
        banDetails: {
          ...(b.banDetails || {}),
          bannedByName: b.bannedByProfile ? (b.bannedByProfile.nickname || b.bannedByProfile.fullName) : null,
          bannedByEmail: b.bannedByUser ? b.bannedByUser.email : null,
        },
        deactivationDetails: b.deactivationDetails,
        deletionDetails: b.deletionDetails,
        suspensionDetails: {
          ...(b.suspensionDetails || {}),
          suspendedByName: b.suspendedByProfile ? (b.suspendedByProfile.nickname || b.suspendedByProfile.fullName) : null,
          suspendedByEmail: b.suspendedByUser ? b.suspendedByUser.email : null,
        },
        createdAt: b.createdAt,
      },
      profile: {
        profileId: b.profile ? b.profile._id : null,
        nickname: b.profile ? b.profile.nickname : null,
        fullName: b.profile ? b.profile.fullName : null,
        dob: b.profile ? b.profile.dob : null,
        age: b.profile ? b.profile.calculatedAge : null,
        gender: b.profile ? b.profile.gender : null,
        height: b.profile ? b.profile.height : null,
        about: b.profile ? b.profile.about : null,
        jobTitle: b.profile ? b.profile.jobTitle : null,
        company: b.profile ? b.profile.company : null,
        school: b.profile ? b.profile.school : null,
        totalCompletion: b.profile && b.profile.onboardingProgress ? b.profile.onboardingProgress.totalCompletion : null,
        livingIn: b.profile ? b.profile.livingIn : null,
      },
      subscription: {
        _id: (b.currentSubscription && b.currentSubscription._id) || (b.latestSubscription && b.latestSubscription._id) || null,
        status: (b.currentSubscription && b.currentSubscription.status) || (b.latestSubscription && b.latestSubscription.status) || null,
        planType: (b.currentSubscription && b.currentSubscription.planType) || (b.latestSubscription && b.latestSubscription.planType) || null,
        platform: (b.currentSubscription && b.currentSubscription.platform) || (b.latestSubscription && b.latestSubscription.platform) || null,
        startedAt: (b.currentSubscription && b.currentSubscription.startedAt) || (b.latestSubscription && b.latestSubscription.startedAt) || null,
        expiresAt: (b.currentSubscription && b.currentSubscription.expiresAt) || (b.latestSubscription && b.latestSubscription.expiresAt) || null,
        availableSuperKeens: totalSuperKeens,
        availableBoosts: totalBoosts,
        details: {
          superKeens: {
            baseLimit: skRemaining === -1 ? "Unlimited" : (skRemaining || 0),
            granted: walletSK
          },
          boosts: {
            baseLimit: boostRemaining === -1 ? "Unlimited" : (boostRemaining || 0),
            granted: walletBoosts
          }
        },
        isCurrentlyActive: (() => {
          const c = b.currentSubscription;
          if (!c) return false;
          const now = new Date();
          const cond1 = ["ACTIVE", "CANCELLED"].includes(c.status) && new Date(c.expiresAt) > now;
          const cond2 = c.status === "GRACE" && c.isInGracePeriod === true;
          const cond3 = c.isInBillingRetry === true;
          return cond1 || cond2 || cond3;
        })(),
        autoRenew: (b.currentSubscription && b.currentSubscription.autoRenew) || (b.latestSubscription && b.latestSubscription.autoRenew) || false,
      },
      transactions: transactionHistory,
      attributes: {
        zodiac: b.profile && b.profile.attributes ? b.profile.attributes.zodiac : null,
        education: b.profile && b.profile.attributes ? b.profile.attributes.education : null,
        familyPlans: b.profile && b.profile.attributes ? b.profile.attributes.familyPlans : null,
        personalityType: b.profile && b.profile.attributes ? b.profile.attributes.personalityType : null,
        communicationStyle: b.profile && b.profile.attributes ? b.profile.attributes.communicationStyle : null,
        loveStyle: b.profile && b.profile.attributes ? b.profile.attributes.loveStyle : null,
        pets: b.profile && b.profile.attributes ? b.profile.attributes.pets : null,
        drinking: b.profile && b.profile.attributes ? b.profile.attributes.drinking : null,
        smoking: b.profile && b.profile.attributes ? b.profile.attributes.smoking : null,
        workout: b.profile && b.profile.attributes ? b.profile.attributes.workout : null,
        dietary: b.profile && b.profile.attributes ? b.profile.attributes.dietary : null,
        sleeping: b.profile && b.profile.attributes ? b.profile.attributes.sleeping : null,
        socialMedia: b.profile && b.profile.attributes ? b.profile.attributes.socialMedia : null,
        languages: b.profile && b.profile.attributes ? b.profile.attributes.languages : null,
        interests: b.profile && b.profile.attributes ? b.profile.attributes.interests : null,
        music: b.profile && b.profile.attributes ? b.profile.attributes.music : null,
        movies: b.profile && b.profile.attributes ? b.profile.attributes.movies : null,
        books: b.profile && b.profile.attributes ? b.profile.attributes.books : null,
        travel: b.profile && b.profile.attributes ? b.profile.attributes.travel : null,
        religion: b.profile && b.profile.attributes ? b.profile.attributes.religion : null,
        relationshipGoal: b.profile && b.profile.discovery ? b.profile.discovery.relationshipGoal : null,
      },
      discovery: {
        distanceRange: b.profile && b.profile.discovery ? b.profile.discovery.distanceRange : null,
        ageRange: b.profile && b.profile.discovery ? b.profile.discovery.ageRange : null,
        showMeGender: b.profile && b.profile.discovery ? b.profile.discovery.showMeGender : null,
        relationshipGoal: b.profile && b.profile.discovery ? b.profile.discovery.filterRelationshipGoal : null,
        globalVisibility: b.profile && b.profile.discovery ? b.profile.discovery.globalVisibility : null,
        discoveryFilters: b.profile && b.profile.discovery ? b.profile.discovery.advancedFilters : null,
      },
      settings: {
        notifications: b.notificationSettings,
        blockedContacts: (b.blockedContactsData || []).map(bc => ({
          _id: bc._id,
          blockedName: bc.blockedName,
          blockedPhone: bc.blockedPhone,
          blockedPhoneHash: bc.blockedPhoneHash,
          source: bc.source,
          blockedAt: bc.createdAt,
        })),
        blockedUsers: blockedUsersData,
        blockedBy: b.blockedByData || undefined,
      },
      location: b.profile ? b.profile.location : null,
      photos: b.profile ? b.profile.photos : null,
      verification: b.profile ? b.profile.verification : null,
      auditLogs: (b.auditLogs || []).sort((x, y) => new Date(y.actedAt) - new Date(x.actedAt)).map(log => {
        const adminProf = (b.auditAdminProfiles || []).find(ap => ap.userId && ap.userId.toString() === (log.actedBy || "").toString());
        return {
          action: log.action,
          reason: log.reason,
          timestamp: log.actedAt,
          details: log.details,
          by: adminProf && adminProf.nickname ? adminProf.nickname : "System"
        };
      }),
      lastProfileUpdate: b.profile ? b.profile.lastProfileUpdate : null,
    };

    // 5. Log the view action in Audit Logs
    try {
      await User.findByIdAndUpdate(userId, {
        $push: {
          auditLogs: {
            action: "view_profile",
            reason: "Admin viewed profile details",
            actedBy: req.user?._id,
            actedAt: new Date(),
          },
        },
      });
    } catch (auditErr) {
      console.error("Failed to log profile view:", auditErr);
    }

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: finalData,
    });
  } catch (error) {
    console.error("GET SINGLE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/* ======: For Update Single User Detail:====API 3: PATCH api/v1/admin/user-management/:userId/status =========== */
module.exports.UPDATESingleUserDetail = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;

    /* --------------------------------
     * 1️⃣ Validate Request Body with Joi
     * ------------------------------- */
    const { error, value } = updateUserSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      await session.abortTransaction();
      const errorMessages = error.details.map((detail) =>
        detail.message.replace(/"/g, ""),
      );
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: errorMessages,
      });
    }

    // Use 'value' (sanitized data) instead of 'req.body'
    const { accountStatus, isPremium, profile } = value;

    // console.log("profile: ", profile);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId" });
    }

    /* --------------------------------
     * 2️⃣ Update User Model
     * ------------------------------- */
    const userUpdate = {};
    if (accountStatus) userUpdate.accountStatus = accountStatus;
    if (typeof isPremium === "boolean") userUpdate.isPremium = isPremium;

    const user = await User.findOneAndUpdate(
      { _id: userId, role: "USER" },
      { $set: userUpdate },
      { new: true, session },
    );

    if (!user) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    /* --------------------------------
     * 3️⃣ Update Profile Model (Dot-Notation)
     * ------------------------------- */
    let updatedProfile = await Profile.findOne({ userId }).session(session);

    if (profile) {
      const profileUpdate = {};

      // Fields to map directly
      const flatFields = [
        "nickname",
        "gender",
        "age",
        "height",
        "about",
        "jobTitle",
        "company",
        "school",
        "livingIn",
      ];
      flatFields.forEach((field) => {
        if (profile[field] !== undefined) profileUpdate[field] = profile[field];
      });

      // Use null-safe helper for nested mapping
      const nestedUpdates = mapNestedProfileUpdates(profile);
      // nestedUpdates includes flat fields too; merge them,
      // but since we already handled flat fields above, only
      // take the dot-notation keys from the helper.
      Object.keys(nestedUpdates).forEach((key) => {
        if (key.includes(".")) {
          profileUpdate[key] = nestedUpdates[key];
        }
      });

      if (Object.keys(profileUpdate).length > 0) {
        profileUpdate.lastProfileUpdate = new Date();
        updatedProfile = await Profile.findOneAndUpdate(
          { userId },
          { $set: profileUpdate },
          { new: true, runValidators: true, session },
        );
      }
    }

    // 4. Push to auditLogs for Profile Update
    user.auditLogs.push({
      action: "update_profile",
      reason: "Manual profile update by admin",
      actedBy: req.user?._id,
      actedAt: new Date(),
      details: {
        updatedFields: [
          ...Object.keys(profile || {}),
          ...Object.keys(userUpdate),
        ],
      },
    });
    await user.save({ session });

    const response = {
      _id: user._id,
      role: user.role,
      account: {
        status: user.accountStatus,
        isPremium: user.isPremium,
        phone: user.phone,
        email: user.email,
        authMethod: user.authMethod,
        banDetails: user.banDetails,
        deactivationDetails: user.deactivationDetails,
        deletionDetails: user.deletionDetails,
        createdAt: user.createdAt,
      },
      profile: {
        profileId: updatedProfile._id,
        nickname: updatedProfile.nickname,
        dob: updatedProfile.dob,
        age: updatedProfile.age,
        gender: updatedProfile.gender,
        height: updatedProfile.height,
        about: updatedProfile.about,
        jobTitle: updatedProfile.jobTitle,
        company: updatedProfile.company,
        totalCompletion: updatedProfile.onboardingProgress.totalCompletion,
      },
      settings: updatedProfile.settings,
      attributes: updatedProfile.attributes,
      discoveryFilters: updatedProfile.discoveryFilters,
      location: updatedProfile.location,
      photos: updatedProfile.photos,
      verification: updatedProfile.verification,
      subscription: updatedProfile.subscription,
      onboardingProgress: updatedProfile.onboardingProgress,
      createdAt: updatedProfile.createdAt,
      lastProfileUpdate: updatedProfile.lastProfileUpdate,
      isPhoneVerified: updatedProfile.isPhoneVerified,
      isEmailVerified: updatedProfile.isEmailVerified,
    };

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "User and Profile updated successfully",
      data: response,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/*=====: PATCH api/v1/admin/user-management/:userId/status======*/
module.exports.UPDATEUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountStatus } = req.body;

    if (!accountStatus) {
      return res.status(400).json({
        success: false,
        message: "accountStatus is required",
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, role: "USER" },
      { $set: { accountStatus } },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Push to auditLogs
    user.auditLogs.push({
      action: accountStatus === "active" ? "unban" : accountStatus,
      reason: req.body.reason || "Status update from User Management",
      actedBy: req.user?._id,
      actedAt: new Date(),
    });
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User status updated",
      data: user,
    });
  } catch (err) {
    console.error("STATUS UPDATE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

module.exports.DELETEPhoto = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { publicId } = req.body;
    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found" });
    }

    const photoIndex = profile.photos.findIndex((p) => p.publicId === publicId);

    if (photoIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Photo not found in profile" });
    }

    try {
      await destroy(publicId);
    } catch (cloudinaryErr) {
      console.error("Cloudinary Error:", cloudinaryErr);
    }

    profile.photos.splice(photoIndex, 1);

    profile.photos = profile.photos.map((photo, index) => ({
      ...photo.toObject(),
      order: index + 1,
      isPrimary: index === 0,
    }));

    await profile.save();

    // Log the photo deletion
    const userObj = await User.findById(userId);
    if (userObj) {
      userObj.auditLogs.push({
        action: "delete_photo",
        reason: "Admin deleted inappropriate photo",
        actedBy: req.user?._id,
        actedAt: new Date(),
        details: { publicId },
      });
      await userObj.save();
    }

    res.status(200).json({
      success: true,
      message: "Photo deleted and order updated successfully",
      data: {
        profile: profile,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======: For Bluk exports in csv file to get all Users Data: API 4: GET api/v1/admin/user-management/export =========== */
module.exports.streamUsersExport = async (req, res) => {
  try {
    // 1. Core Match: Export real users only (exclude fake profiles)
    const userMatch = { role: "USER", isFake: { $ne: true } };
    const pipeline = [{ $match: userMatch }];

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=KeenMustard_Users_${Date.now()}.csv`,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const csvStream = stringify({
      header: true,
      columns: [
        "UserId",
        "Nickname",
        "Email",
        "Phone",
        "Gender",
        "Age",
        "ProfileType", // ✅ Added "Fake" or "Real"
        "JobTitle",
        "City",
        "KYCStatus",
        "LastActiveAt",
        "ProfileCompletion",
        "AccountStatus",
        "IsPremium",
        "AuthMethod",
        "CreatedAt",
      ],
    });

    csvStream.pipe(res);

    // ✅ FIX 1: Helper function for consistent date formatting
    const formatDate = (d) => {
      if (!d) return "";
      return new Date(d).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    // 4. Final Aggregation Pipeline
    pipeline.push({ $sort: { createdAt: -1 } });

    // 3. Lookup profiles for CSV data (nickname, gender, etc.)
    pipeline.push(
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    );

    pipeline.push({
      $project: {
        _id: 1,
        email: 1,
        phone: 1,
        accountStatus: 1,
        isPremium: 1,
        authMethod: 1,
        createdAt: 1,
        lastLoginAt: 1,
        isFake: 1, // ✅ Include isFake flag
        nickname: "$profile.nickname",
        gender: "$profile.gender",
        age: "$profile.age",
        dob: "$profile.dob",
        jobTitle: "$profile.jobTitle",
        city: "$profile.location.city",
        profileCompletion: "$profile.onboardingProgress.totalCompletion",
        kycStatus: "$profile.verification.status",
      },
    });

    const totalUsers = await User.countDocuments(userMatch);
    const cursor = User.aggregate(pipeline).cursor({ batchSize: 10000 });
    let processedCount = 0;
    let lastSentProgress = -1;

    for await (const doc of cursor) {
      processedCount++;
      const currentProgress = Math.floor((processedCount / totalUsers) * 100);
      if (currentProgress > lastSentProgress) {
        lastSentProgress = currentProgress;
        // NOTE: Progress markers removed — they polluted the CSV stream.
        // Use SSE or a separate endpoint for export progress tracking.
      }

      // ✅ Robust Age Calculation
      let finalAge = "";
      if (doc.dob) {
        const calculated = calculateAge(doc.dob);
        finalAge =
          calculated !== null && !isNaN(calculated)
            ? calculated
            : doc.age || "";
      } else {
        finalAge = doc.age || "";
      }

      csvStream.write({
        UserId: doc._id.toString(),
        Nickname: doc.nickname || "",
        Email: doc.email || "",
        Phone: doc.phone ? `\t${doc.phone}` : "",
        Gender: doc.gender || "",
        Age: finalAge,
        ProfileType: doc.isFake ? "Fake" : "Real", // ✅ Explicitly show if it's a fake profile
        JobTitle: doc.jobTitle || "",
        City: doc.city || "",
        KYCStatus: doc.kycStatus || "not_started",
        LastActiveAt: formatDate(doc.lastLoginAt),
        ProfileCompletion: `${doc.profileCompletion || 0}%`,
        AccountStatus: doc.accountStatus || "",
        IsPremium: doc.isPremium ? "Yes" : "No",
        AuthMethod: doc.authMethod || "phone",
        CreatedAt: formatDate(doc.createdAt),
      });
    }

    csvStream.end();
  } catch (error) {
    console.error("STREAM EXPORT ERROR:", error);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: "Export failed" });
    else res.end();
  }
};

module.exports.GETGhostingUsers = async (req, res) => {
  try {
    const {
      page: reqPage,
      limit: reqLimit,
      search,
      from,
      to,
      preset,
      view = "ghosted",
      isPremium,
      gender,
    } = req.query;

    const page = Math.max(parseInt(reqPage) || 1, 1);
    const limit = Math.min(parseInt(reqLimit) || 10, 100);
    const skip = (page - 1) * limit;
    const searchTrimmed = search?.trim();

    // 1. Resolve Date Range (Matches Dashboard Logic) — uses centralized helper
    const resolved = resolveDatePreset(preset, from, to);
    const { startDate, endDate } = resolved;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // ==========================================
    // 2. PRODUCTION-READY ENGAGEMENT IDENTIFICATION
    // ==========================================
    const Match = mongoose.model("Match");
    const Block = mongoose.model("Block");

    // Range filter for engagement metrics
    const rangeFilter = {};
    if (startDate && endDate) {
      rangeFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Parallel calculations for unique user counts in each category
    const [
      totalMatchesUsers,
      ghostedMatchesUsers,
      activeMatchesUsers,
      totalBlockedUsers,
      totalGhostedUsers,
    ] = await Promise.all([
      // 1. Total matches in range
      Match.countDocuments(rangeFilter),

      // 2. Total ghosted matches in range
      Match.countDocuments({ lastMessageBy: null, ...rangeFilter }),

      // 3. Total active matches in range
      Match.countDocuments({ lastMessageBy: { $ne: null }, ...rangeFilter }),

      // 4. Unique users involved in blocks after chatting in range
      Block.aggregate([
        { $match: rangeFilter },
        {
          $lookup: {
            from: "matches",
            localField: "blockerId",
            foreignField: "users",
            as: "match",
          },
        },
        {
          $addFields: {
            match: {
              $filter: {
                input: "$match",
                as: "m",
                cond: {
                  $and: [
                    { $in: ["$blockedId", "$$m.users"] },
                    { $ne: ["$$m.lastMessageBy", null] }
                  ]
                }
              }
            }
          }
        },
        { $match: { "match.0": { $exists: true } } },
        {
          $project: {
            users: ["$blockerId", "$blockedId"],
          },
        },
        { $unwind: "$users" },
        { $group: { _id: "$users" } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "matchedUser",
          },
        },
        { $unwind: "$matchedUser" },
        {
          $match: {
            "matchedUser.role": "USER",
          },
        },
        { $count: "count" },
      ]).then((r) => r[0]?.count || 0),

      // 5. Unique users inactive for 1+ months (Ghosted Users card)
      User.countDocuments({
        role: "USER",
        lastLoginAt: { $lt: oneMonthAgo },
      }),
    ]);

    // 3. IDENTIFY USERS FOR THE CURRENT VIEW
    let targetUserIdsResult = [];

    if (view === "active") {
      // Users who started chatting
      targetUserIdsResult = await Match.aggregate([
        { $match: { lastMessageBy: { $ne: null }, ...rangeFilter } },
        { $unwind: "$users" },
        { $group: { _id: "$users" } },
      ]);
    } else if (view === "blocked") {
      // Users involved in chat-based blocks (both blocker and blocked)
      targetUserIdsResult = await Block.aggregate([
        { $match: rangeFilter },
        {
          $lookup: {
            from: "matches",
            localField: "blockerId",
            foreignField: "users",
            as: "match",
          },
        },
        {
          $addFields: {
            match: {
              $filter: {
                input: "$match",
                as: "m",
                cond: {
                  $and: [
                    { $in: ["$blockedId", "$$m.users"] },
                    { $ne: ["$$m.lastMessageBy", null] }
                  ]
                }
              }
            }
          }
        },
        { $match: { "match.0": { $exists: true } } },
        {
          $project: {
            users: ["$blockerId", "$blockedId"],
          },
        },
        { $unwind: "$users" },
        { $group: { _id: "$users" } },
      ]);
    } else if (view === "matches") {
      // Users who have matches in this period
      targetUserIdsResult = await Match.aggregate([
        { $match: rangeFilter },
        { $unwind: "$users" },
        { $group: { _id: "$users" } },
      ]);
    } else if (view === "ghosted_matches") {
      // Users involved in matches with 0 messages
      targetUserIdsResult = await Match.aggregate([
        { $match: { lastMessageBy: null, ...rangeFilter } },
        { $unwind: "$users" },
        { $group: { _id: "$users" } },
      ]);
    } else {
      // Default: Ghosted Users (view === "ghosted") - users inactive for 1+ months
      targetUserIdsResult = await User.aggregate([
        {
          $match: {
            role: "USER",
            lastLoginAt: { $lt: oneMonthAgo },
          },
        },
        { $project: { _id: 1 } },
      ]);
    }

    const targetUserIdsArray = targetUserIdsResult.map((u) => u._id);

    if (targetUserIdsArray.length === 0) {
      return res.status(200).json({
        success: true,
        cached: false,
        pagination: { page, limit, total: 0, totalPages: 0 },
        kpiStats: {
          totalUsers: totalGhostedUsers,
          activeTotal: 0,
          premiumTotal: 0,
          bannedTotal: 0,
          suspendedTotal: 0,
          totalMatches: totalMatchesUsers,
          ghostedMatches: ghostedMatchesUsers,
          activeMatches: activeMatchesUsers,
          totalBlocks: totalBlockedUsers,
        },
        message: `No ${view} users found for this period`,
        data: [],
      });
    }

    // ==========================================
    // 4. FETCH USERS EXACTLY LIKE GETAllUsers
    // ==========================================
    const baseMatch = {
      _id: { $in: targetUserIdsArray },
      role: "USER",
    };

    if (isPremium !== undefined && isPremium !== "") {
      baseMatch.isPremium = isPremium === "true" || isPremium === true;
    }

    const pipeline = [{ $match: baseMatch }];
    const needsEarlyProfileLookup = !!(gender || searchTrimmed);

    if (needsEarlyProfileLookup) {
      pipeline.push(
        {
          $lookup: {
            from: "profiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        getSafeAgePipeline(),
      );

      if (gender) {
        pipeline.push({ $match: { "profile.gender": gender } });
      }

      if (searchTrimmed) {
        const searchRegex = new RegExp(
          searchTrimmed.replace(/[.*+?^${}()|[\\/]\\]/g, "\\$&"),
          "i",
        );
        pipeline.push({
          $match: {
            $or: [{ email: searchRegex }, { "profile.nickname": searchRegex }],
          },
        });
      }
    }

    const dataPipeline = [
      { $sort: { lastLoginAt: 1 } },
      { $skip: skip },
      { $limit: limit },
      ...(!needsEarlyProfileLookup
        ? [
          {
            $lookup: {
              from: "profiles",
              localField: "_id",
              foreignField: "userId",
              as: "profile",
            },
          },
          {
            $unwind: {
              path: "$profile",
              preserveNullAndEmptyArrays: true,
            },
          },
          getSafeAgePipeline(),
        ]
        : []),
      {
        $project: {
          _id: 1,
          role: 1,
          account: {
            status: "$accountStatus",
            isPremium: "$isPremium",
            phone: "$phone",
            email: "$email",
            authMethod: "$authMethod",
            banDetails: "$banDetails",
            deactivationDetails: "$deactivationDetails",
            deletionDetails: "$deletionDetails",
            suspensionDetails: "$suspensionDetails",
            createdAt: "$createdAt",
          },
          profile: {
            profileId: "$profile._id",
            nickname: "$profile.nickname",
            dob: "$profile.dob",
            age: "$profile.calculatedAge",
            gender: "$profile.gender",
            height: "$profile.height",
            about: "$profile.about",
            jobTitle: "$profile.jobTitle",
            company: "$profile.company",
            totalCompletion: "$profile.onboardingProgress.totalCompletion",
          },
          location: "$profile.location",
          photos: { $arrayElemAt: ["$profile.photos.url", 0] },
          lastProfileUpdate: "$profile.lastProfileUpdate",
          createdAt: 1,
          lastLoginAt: 1,
        },
      },
    ];

    let users = [];
    let total = 0, activeTotal = 0, premiumTotal = 0, bannedTotal = 0, suspendedTotal = 0;

    if (!needsEarlyProfileLookup) {
      const [
        usersData, t, a, p, b, s
      ] = await Promise.all([
        User.aggregate([...pipeline, ...dataPipeline]),
        User.countDocuments(baseMatch),
        User.countDocuments({ ...baseMatch, accountStatus: "active" }),
        User.countDocuments({ ...baseMatch, isPremium: true }),
        User.countDocuments({ ...baseMatch, accountStatus: "banned" }),
        User.countDocuments({ ...baseMatch, accountStatus: "suspended" }),
      ]);
      users = usersData;
      total = t;
      activeTotal = a;
      premiumTotal = p;
      bannedTotal = b;
      suspendedTotal = s;
    } else {
      const [
        usersData, t, a, p, b, s
      ] = await Promise.all([
        User.aggregate([...pipeline, ...dataPipeline]),
        User.aggregate([...pipeline, { $count: "count" }]),
        User.aggregate([...pipeline, { $match: { accountStatus: "active" } }, { $count: "count" }]),
        User.aggregate([...pipeline, { $match: { isPremium: true } }, { $count: "count" }]),
        User.aggregate([...pipeline, { $match: { accountStatus: "banned" } }, { $count: "count" }]),
        User.aggregate([...pipeline, { $match: { accountStatus: "suspended" } }, { $count: "count" }]),
      ]);
      users = usersData;
      total = t[0]?.count || 0;
      activeTotal = a[0]?.count || 0;
      premiumTotal = p[0]?.count || 0;
      bannedTotal = b[0]?.count || 0;
      suspendedTotal = s[0]?.count || 0;
    }

    const responseData = {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpiStats: {
        totalUsers: totalGhostedUsers,
        activeTotal,
        premiumTotal,
        bannedTotal,
        suspendedTotal,
        totalMatches: totalMatchesUsers,
        ghostedMatches: ghostedMatchesUsers,
        activeMatches: activeMatchesUsers,
        totalBlocks: totalBlockedUsers,
      },
      message: "Ghosting Users fetched successfully",
      data: users,
    };

    return res.status(200).json({
      success: true,
      cached: false,
      ...responseData,
    });
  } catch (error) {
    console.error("GET GHOSTING USER LIST ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ghosting users",
    });
  }
};