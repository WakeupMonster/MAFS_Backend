const mongoose = require("mongoose");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const { updateUserSchema } = require("./user.management.validation");
const { stringify } = require("csv-stringify");
const { destroy } = require("../../upload/cloudinary.service");
const { calculateAge } = require("../../../common/utils/calculate.age");

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
    } = req.query;

    const page = Math.max(parseInt(reqPage) || 1, 1);
    const limit = Math.min(parseInt(reqLimit) || 10, 100);
    const skip = (page - 1) * limit;
    const searchTrimmed = search?.trim();

    const baseMatch = { role: "USER", isFake: { $ne: true } };

    // --- GHOSTING FILTER LOGIC (Inactive for > 2 Months) ---
    if (isGhosting === "true") {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      // Filter users who haven't been active in the last 2 months
      baseMatch.lastLoginAt = { $lt: twoMonthsAgo };
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
        {
          $addFields: {
            "profile.calculatedAge": {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$profile.dob", null] },
                    { $toLower: "$profile.dob" },
                  ],
                },
                then: {
                  $dateDiff: {
                    startDate: { $toDate: "$profile.dob" },
                    endDate: "$$NOW",
                    unit: "year",
                  },
                },
                else: null,
              },
            },
          },
        },
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

    // Facet Stage
    pipeline.push({
      $facet: {
        data: [
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
              {
                $addFields: {
                  "profile.calculatedAge": {
                    $cond: {
                      if: {
                        $and: [
                          { $gt: ["$profile.dob", null] },
                          { $toLower: "$profile.dob" },
                        ],
                      },
                      then: {
                        $dateDiff: {
                          startDate: { $toDate: "$profile.dob" },
                          endDate: "$$NOW",
                          unit: "year",
                        },
                      },
                      else: null,
                    },
                  },
                },
              },
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
        ],
        total: [{ $count: "count" }],
        activeCount: [
          { $match: { accountStatus: "active" } },
          { $count: "count" },
        ],
        premiumCount: [{ $match: { isPremium: true } }, { $count: "count" }],
        bannedCount: [
          { $match: { accountStatus: "banned" } },
          { $count: "count" },
        ],
        suspendedCount: [
          { $match: { accountStatus: "suspended" } },
          { $count: "count" },
        ],
      },
    });

    const result = await User.aggregate(pipeline);
    const users = result[0]?.data || [];
    const total = result[0]?.total[0]?.count || 0;
    const activeTotal = result[0]?.activeCount[0]?.count || 0;
    const premiumTotal = result[0]?.premiumCount[0]?.count || 0;
    const bannedTotal = result[0]?.bannedCount[0]?.count || 0;
    const suspendedTotal = result[0]?.suspendedCount[0]?.count || 0;

    const responseData = {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpiStats: {
        totalUsers: total,
        activeTotal,
        premiumTotal,
        bannedTotal,
        suspendedTotal,
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

/* ======: For GET SINGLE USER DETAILS – ADMIN:====API 2: GET api/v1/admin/user-management/:userId =========== */
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

    // 2. Aggregation Pipeline
    const pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      // 1. Join Profile
      {
        $lookup: {
          from: "profiles", // Collection name check karein (usually plural)
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      {
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: true, // Profile nahi bani toh bhi user data milega
        },
      },
      // --- AGE CALCULATION START ---
      {
        $addFields: {
          "profile.calculatedAge": {
            $cond: {
              if: {
                $and: [
                  { $gt: ["$profile.dob", null] },
                  { $toLower: "$profile.dob" },
                ],
              },
              then: {
                $dateDiff: {
                  startDate: { $toDate: "$profile.dob" },
                  endDate: "$$NOW",
                  unit: "year",
                },
              },
              else: null,
            },
          },
        },
      },
      // --- AGE CALCULATION END ---
      // 2. Join Account
      {
        $lookup: {
          from: "accounts",
          localField: "_id",
          foreignField: "userId",
          as: "account",
        },
      },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      // 3. Swipe Stats
      {
        $lookup: {
          from: "swipes",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$swiperId", "$$userId"] } } },
            {
              $group: {
                _id: null,
                totalSwipes: { $sum: 1 },
                likes: {
                  $sum: { $cond: [{ $eq: ["$action", "like"] }, 1, 0] },
                },
                superLikes: {
                  $sum: { $cond: [{ $eq: ["$action", "superlike"] }, 1, 0] },
                },
                rejections: {
                  $sum: { $cond: [{ $eq: ["$action", "pass"] }, 1, 0] },
                },
              },
            },
          ],
          as: "swipeStats",
        },
      },
      { $unwind: { path: "$swipeStats", preserveNullAndEmptyArrays: true } },
      // 4. Match History
      {
        $lookup: {
          from: "matches",
          let: { currentUserId: "$_id" },
          pipeline: [
            { $match: { $expr: { $in: ["$$currentUserId", "$users"] } } },
            { $sort: { matchedAt: -1 } },
            {
              $addFields: {
                otherUserId: {
                  $first: {
                    $filter: {
                      input: "$users",
                      as: "uId",
                      cond: { $ne: ["$$uId", "$$currentUserId"] },
                    },
                  },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "otherUserId",
                foreignField: "_id",
                as: "otherUser",
              },
            },
            {
              $unwind: {
                path: "$otherUser",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "profiles",
                localField: "otherUserId",
                foreignField: "userId",
                as: "otherProfile",
              },
            },
            {
              $unwind: {
                path: "$otherProfile",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                matchedAt: 1,
                ouserId: "$otherProfile.userId",
                nickname: "$otherProfile.nickname",
                email: "$otherUser.email",
                age: "$otherProfile.age",
                photo: { $arrayElemAt: ["$otherProfile.photos.url", 0] },
              },
            },
          ],
          as: "matchData",
        },
      },
      // 5. Blocked Users & Blocked Contacts.
      {
        $lookup: {
          from: "blocks",
          let: { currentUserId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$blockerId", "$$currentUserId"] } } },
            {
              $lookup: {
                from: "users",
                localField: "blockedId",
                foreignField: "_id",
                as: "blockedUserInfo",
              },
            },
            {
              $unwind: {
                path: "$blockedUserInfo",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "profiles",
                localField: "blockedId",
                foreignField: "userId",
                as: "blockedProfile",
              },
            },
            {
              $unwind: {
                path: "$blockedProfile",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: "$blockedId",
                nickname: { $ifNull: ["$blockedProfile.nickname", ""] },
                photo: { $arrayElemAt: ["$blockedProfile.photos.url", 0] },
                email: { $ifNull: ["$blockedUserInfo.email", ""] },
                phone: { $ifNull: ["$blockedUserInfo.phone", ""] },
                blockedAt: "$createdAt",
              },
            },
          ],
          as: "blockedUsersData",
        },
      },
      {
        $lookup: {
          from: "blockedcontacts",
          localField: "_id",
          foreignField: "userId",
          as: "blockedContactsData",
        },
      },
      // 6. Subscriptions & Transactions
      {
        $lookup: {
          from: "subscriptions", // Look up the main subscription record
          localField: "_id",
          foreignField: "userId",
          as: "subscriptionInfo",
        },
      },
      {
        $addFields: {
          // Get the most recent/active subscription
          currentSubscription: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: {
                    $filter: {
                      input: "$subscriptionInfo",
                      as: "sub",
                      cond: {
                        $in: [
                          "$$sub.status",
                          ["ACTIVE", "CANCELLED", "GRACE", "PENDING"],
                        ],
                      },
                    },
                  },
                  sortBy: { expiresAt: -1 },
                },
              },
              0,
            ],
          },
          // If no active, just get the latest one by date
          latestSubscription: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: "$subscriptionInfo",
                  sortBy: { expiresAt: -1 },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $lookup: {
          from: "subscriptiontransactions",
          localField: "_id",
          foreignField: "userId",
          as: "transactionHistory",
        },
      },
      {
        $addFields: {
          transactionHistory: {
            $sortArray: {
              input: "$transactionHistory",
              sortBy: { createdAt: -1 },
            },
          },
        },
      },
      // 7. Join Consumable Balances (SuperKeens & Boosts) - NEW
      {
        $lookup: {
          from: "user_consumable_balances",
          localField: "_id",
          foreignField: "userId",
          as: "consumableBalances",
        },
      },
      {
        $unwind: {
          path: "$consumableBalances",
          preserveNullAndEmptyArrays: true,
        },
      },
      // 8. Reports Against This User (New Stage)
      {
        $lookup: {
          from: "reports", // Collection name check karein (Report model ka plural)
          let: { currentUserId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$reportedId", "$$currentUserId"] } } },
            { $sort: { createdAt: -1 } }, // Latest reports pehle
            {
              $lookup: {
                from: "profiles",
                localField: "reporterId",
                foreignField: "userId",
                as: "reporterInfo",
              },
            },
            {
              $project: {
                _id: 1,
                reason: 1,
                type: 1,
                status: 1,
                severity: 1,
                createdAt: 1,
                reporterNickname: {
                  $arrayElemAt: ["$reporterInfo.nickname", 0],
                },
              },
            },
          ],
          as: "reportsReceived",
        },
      },
      // 9. Lookup for Suspended By
      {
        $lookup: {
          from: "users",
          localField: "suspensionDetails.suspendedBy",
          foreignField: "_id",
          as: "suspendedByUser",
        },
      },
      {
        $unwind: {
          path: "$suspendedByUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "profiles",
          localField: "suspensionDetails.suspendedBy",
          foreignField: "userId",
          as: "suspendedByProfile",
        },
      },
      {
        $unwind: {
          path: "$suspendedByProfile",
          preserveNullAndEmptyArrays: true,
        },
      },
      // 10. Lookup for Banned By
      {
        $lookup: {
          from: "users",
          localField: "banDetails.bannedBy",
          foreignField: "_id",
          as: "bannedByUser",
        },
      },
      {
        $unwind: {
          path: "$bannedByUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "profiles",
          localField: "banDetails.bannedBy",
          foreignField: "userId",
          as: "bannedByProfile",
        },
      },
      {
        $unwind: {
          path: "$bannedByProfile",
          preserveNullAndEmptyArrays: true,
        },
      },
      // 11. Lookup profiles for all audit logs (Admin names)
      {
        $lookup: {
          from: "profiles",
          localField: "auditLogs.actedBy",
          foreignField: "userId",
          as: "auditAdminProfiles",
        },
      },
      {
        $project: {
          _id: 1,
          isPhoneVerified: 1,
          isEmailVerified: 1,
          role: 1,
          lastLoginAt: 1,
          // ============ NEW SECURITY & DEVICE DATA ============
          security: {
            currentIp: "$currentIp",
            lastUsedDevice: "$lastUsedDevice",
            activeSessions: "$sessions", // Saare active devices
            history: "$loginHistory", // Poori login history list
          },
          // Statistics (total, swipe, likes, superlikes, rejection, matches, transactions, reports, login count)
          stats: {
            totalSwipes: { $ifNull: ["$swipeStats.totalSwipes", 0] },
            totalLikes: { $ifNull: ["$swipeStats.likes", 0] },
            totalSuperLikes: { $ifNull: ["$swipeStats.superLikes", 0] },
            totalRejections: { $ifNull: ["$swipeStats.rejections", 0] },
            totalMatches: { $size: "$matchData" },
            totalTransactions: { $size: "$transactionHistory" }, // Useful stat
            totalReports: { $size: "$reportsReceived" }, // Kitni reports hui total
            pendingReports: {
              $size: {
                $filter: {
                  input: "$reportsReceived",
                  as: "r",
                  cond: { $eq: ["$$r.status", "new"] },
                },
              },
            },
            totalSessions: { $size: { $ifNull: ["$sessions", []] } },
          },
          // Reports ka detail data
          reports: "$reportsReceived",
          // Show only the 5 most recent matches in the array
          recentMatches: { $slice: ["$matchData", 5] },
          // Flattened Account Info
          account: {
            status: "$accountStatus",
            isPremium: "$isPremium",
            phone: "$phone",
            email: "$email",
            authMethod: "$authMethod",
            banDetails: {
              $mergeObjects: [
                "$banDetails",
                {
                  bannedByName: {
                    $ifNull: [
                      "$bannedByProfile.nickname",
                      "$bannedByProfile.fullName",
                    ],
                  },
                  bannedByEmail: "$bannedByUser.email",
                },
              ],
            },
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
          // Profile Info
          profile: {
            profileId: "$profile._id",
            nickname: "$profile.nickname",
            fullName: "$profile.fullName",
            dob: "$profile.dob",
            age: "$profile.calculatedAge",
            gender: "$profile.gender",
            height: "$profile.height",
            about: "$profile.about",
            jobTitle: "$profile.jobTitle",
            company: "$profile.company",
            school: "$profile.school",
            totalCompletion: "$profile.onboardingProgress.totalCompletion",
            livingIn: "$profile.livingIn",
          },
          // Subscription Detail
          subscription: {
            _id: {
              $ifNull: ["$currentSubscription._id", "$latestSubscription._id"],
            },
            status: {
              $ifNull: [
                "$currentSubscription.status",
                "$latestSubscription.status",
              ],
            },
            planType: {
              $ifNull: [
                "$currentSubscription.planType",
                "$latestSubscription.planType",
              ],
            },
            platform: {
              $ifNull: [
                "$currentSubscription.platform",
                "$latestSubscription.platform",
              ],
            },
            startedAt: {
              $ifNull: [
                "$currentSubscription.startedAt",
                "$latestSubscription.startedAt",
              ],
            },
            expiresAt: {
              $ifNull: [
                "$currentSubscription.expiresAt",
                "$latestSubscription.expiresAt",
              ],
            },
            // Available Balance Stats
            availableSuperKeens: {
              $ifNull: ["$consumableBalances.superKeensBalance", 0],
            },
            availableBoosts: {
              $ifNull: ["$consumableBalances.boostsBalance", 0],
            },
            isCurrentlyActive: {
              $or: [
                {
                  $and: [
                    {
                      $in: [
                        "$currentSubscription.status",
                        ["ACTIVE", "CANCELLED"],
                      ],
                    },
                    { $gt: ["$currentSubscription.expiresAt", "$$NOW"] },
                  ],
                },
                {
                  $and: [
                    { $eq: ["$currentSubscription.status", "GRACE"] },
                    { $eq: ["$currentSubscription.isInGracePeriod", true] },
                  ],
                },
                { $eq: ["$currentSubscription.isInBillingRetry", true] },
              ],
            },
            autoRenew: {
              $ifNull: [
                "$currentSubscription.autoRenew",
                { $ifNull: ["$latestSubscription.autoRenew", false] },
              ],
            },
          },
          transactions: "$transactionHistory",
          // Attributes
          attributes: {
            zodiac: "$profile.attributes.zodiac",
            education: "$profile.attributes.education",
            familyPlans: "$profile.attributes.familyPlans",
            personalityType: "$profile.attributes.personalityType",
            communicationStyle: "$profile.attributes.communicationStyle",
            loveStyle: "$profile.attributes.loveStyle",
            pets: "$profile.attributes.pets",
            drinking: "$profile.attributes.drinking",
            smoking: "$profile.attributes.smoking",
            workout: "$profile.attributes.workout",
            dietary: "$profile.attributes.dietary",
            sleeping: "$profile.attributes.sleeping",
            socialMedia: "$profile.attributes.socialMedia",
            languages: "$profile.attributes.languages",
            interests: "$profile.attributes.interests",
            music: "$profile.attributes.music",
            movies: "$profile.attributes.movies",
            books: "$profile.attributes.books",
            travel: "$profile.attributes.travel",
            religion: "$profile.attributes.religion",
            relationshipGoal: "$profile.discovery.relationshipGoal",
          },
          // Discovery
          discovery: {
            distanceRange: "$profile.discovery.distanceRange",
            ageRange: "$profile.discovery.ageRange",
            showMeGender: "$profile.discovery.showMeGender",
            relationshipGoal: "$profile.discovery.filterRelationshipGoal",
            globalVisibility: "$profile.discovery.globalVisibility",
            discoveryFilters: "$profile.discovery.advancedFilters",
          },
          settings: {
            notifications: "$notificationSettings",
            blockedContacts: {
              $map: {
                input: "$blockedContactsData",
                as: "bc",
                in: {
                  _id: "$$bc._id",
                  blockedName: "$$bc.blockedName",
                  blockedPhone: "$$bc.blockedPhone",
                  blockedPhoneHash: "$$bc.blockedPhoneHash",
                  source: "$$bc.source",
                  blockedAt: "$$bc.createdAt",
                },
              },
            },
            blockedUsers: "$blockedUsersData",
            blockedBy: "$blockedByData",
          },
          location: "$profile.location",
          photos: "$profile.photos",
          // Verification Documents (KYC)
          verification: "$profile.verification",
          auditLogs: {
            $map: {
              input: {
                $sortArray: {
                  input: "$auditLogs",
                  sortBy: { actedAt: -1 },
                },
              },
              as: "log",
              in: {
                action: "$$log.action",
                reason: "$$log.reason",
                timestamp: "$$log.actedAt",
                details: "$$log.details",
                by: {
                  $let: {
                    vars: {
                      adminProf: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$auditAdminProfiles",
                              as: "ap",
                              cond: { $eq: ["$$ap.userId", "$$log.actedBy"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      $ifNull: ["$$adminProf.nickname", "System"],
                    },
                  },
                },
              },
            },
          },
          lastProfileUpdate: "$profile.lastProfileUpdate",
        },
      },
    ];

    const result = await User.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Log the view action in Audit Logs
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
      data: result[0],
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

      // FIX: Include 'settings' in the nested mapping loop
      ["attributes", "location", "settings"].forEach((parentKey) => {
        if (profile[parentKey]) {
          Object.keys(profile[parentKey]).forEach((childKey) => {
            // If it's a double-nested object (like settings.notifications)
            if (
              typeof profile[parentKey][childKey] === "object" &&
              !Array.isArray(profile[parentKey][childKey])
            ) {
              Object.keys(profile[parentKey][childKey]).forEach(
                (grandChildKey) => {
                  profileUpdate[`${parentKey}.${childKey}.${grandChildKey}`] =
                    profile[parentKey][childKey][grandChildKey];
                },
              );
            } else {
              profileUpdate[`${parentKey}.${childKey}`] =
                profile[parentKey][childKey];
            }
          });
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
    // 1. Core Match: Export all users (Ignore filters)
    const userMatch = { role: "USER" };
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
        // Sending progress marker via direct response write
        res.write(`---PROG:${currentProgress}---`);
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

    // 1. Resolve Date Range (Matches Dashboard Logic)
    let startDate, endDate;
    if (from && to) {
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === "today") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

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
            let: { b1: "$blockerId", b2: "$blockedId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$b1", "$users"] },
                      { $in: ["$$b2", "$users"] },
                      { $ne: ["$lastMessageBy", null] },
                    ],
                  },
                },
              },
            ],
            as: "match",
          },
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
            let: { b1: "$blockerId", b2: "$blockedId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$b1", "$users"] },
                      { $in: ["$$b2", "$users"] },
                      { $ne: ["$lastMessageBy", null] },
                    ],
                  },
                },
              },
            ],
            as: "match",
          },
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
        {
          $addFields: {
            "profile.calculatedAge": {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$profile.dob", null] },
                    { $toLower: "$profile.dob" },
                  ],
                },
                then: {
                  $dateDiff: {
                    startDate: { $toDate: "$profile.dob" },
                    endDate: "$$NOW",
                    unit: "year",
                  },
                },
                else: null,
              },
            },
          },
        },
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

    pipeline.push({
      $facet: {
        data: [
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
              {
                $addFields: {
                  "profile.calculatedAge": {
                    $cond: {
                      if: {
                        $and: [
                          { $gt: ["$profile.dob", null] },
                          { $toLower: "$profile.dob" },
                        ],
                      },
                      then: {
                        $dateDiff: {
                          startDate: { $toDate: "$profile.dob" },
                          endDate: "$$NOW",
                          unit: "year",
                        },
                      },
                      else: null,
                    },
                  },
                },
              },
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
        ],
        total: [{ $count: "count" }],
        activeCount: [
          { $match: { accountStatus: "active" } },
          { $count: "count" },
        ],
        premiumCount: [{ $match: { isPremium: true } }, { $count: "count" }],
        bannedCount: [
          { $match: { accountStatus: "banned" } },
          { $count: "count" },
        ],
        suspendedCount: [
          { $match: { accountStatus: "suspended" } },
          { $count: "count" },
        ],
      },
    });

    const result = await User.aggregate(pipeline);
    const users = result[0]?.data || [];
    const total = result[0]?.total[0]?.count || 0;
    const activeTotal = result[0]?.activeCount[0]?.count || 0;
    const premiumTotal = result[0]?.premiumCount[0]?.count || 0;
    const bannedTotal = result[0]?.bannedCount[0]?.count || 0;
    const suspendedTotal = result[0]?.suspendedCount[0]?.count || 0;

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
