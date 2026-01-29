const mongoose = require("mongoose");
const redis = require("../../../config/cache");
const User = require("../../auth/auth.model");
const { createCacheKey } = require("../../auth/auth.utils");
const Profile = require("../../profile/profile.model");
const {
  adminUserListSchema,
  updateUserSchema,
} = require("./user.management.validation");
const fs = require("fs");
const path = require("path");
const { stringify } = require("csv-stringify");

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

/* ============================================
 * GET ALL USERS – ADMIN DATATABLE (REDIS) & Search or filters:-
 * API 1: GET api/v1/admin/user-management/user-list
 * ============================================ */
module.exports.GETAllUsers = async (req, res) => {
  try {
    /* -----------------------------
     * 1️⃣ Joi Validation
     * ----------------------------- */
    const { error, value } = adminUserListSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    /* -----------------------------
     * 2️⃣ Redis Cache Check
     * ----------------------------- */
    const cacheKey = createCacheKey("admin:users", value);
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        cached: true,
        message: "GET ALL Users List (cache)",
        ...JSON.parse(cachedData),
      });
    }

    const {
      page,
      limit,
      search,
      accountStatus,
      isPremium,
      gender,
      kycStatus,
      profileComplete,
      sort,
    } = value;

    const skip = (page - 1) * limit;

    /* -----------------------------
     * 3️⃣ User Match
     * ----------------------------- */
    const userMatch = { role: "USER" };

    if (accountStatus) userMatch.accountStatus = accountStatus;
    if (isPremium !== undefined) userMatch.isPremium = isPremium;

    if (search) {
      userMatch.$or = [{ phone: search }, { email: search }];
    }

    /* -----------------------------
     * 4️⃣ Profile Match
     * ----------------------------- */
    const profileMatch = {};

    if (gender) profileMatch.gender = gender;
    if (profileComplete !== undefined)
      profileMatch.isProfileComplete = profileComplete;

    if (kycStatus) profileMatch["kyc.status"] = kycStatus;

    if (search) {
      profileMatch.fullName = { $regex: search, $options: "i" };
    }

    /* -----------------------------
     * 5️⃣ Aggregation
     * ----------------------------- */
    const pipeline = [
      { $match: userMatch },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      { $match: profileMatch },
      {
        $project: {
          userId: "$_id",
          phone: 1,
          email: 1,
          authMethod: 1,
          accountStatus: 1,
          isPremium: 1,
          createdAt: 1,
          lastProfileUpdate: 1,

          avatar: "$profile.avatar",
          fullName: "$profile.fullName",
          nickname: "$profile.nickname",
          gender: "$profile.gender",
          dob: "$profile.dob",
          age: "$profile.age",
          kycStatus: "$profile.kyc.status",
          profileCompletion: "$profile.onboardingProgress.totalCompletion",
          isProfileComplete: "$profile.isProfileComplete",
        },
      },
      { $sort: { [sort]: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const countPipeline = [
      { $match: userMatch },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      { $match: profileMatch },
      { $count: "total" },
    ];

    const [users, totalResult] = await Promise.all([
      User.aggregate(pipeline),
      User.aggregate(countPipeline),
    ]);

    const response = {
      pagination: {
        page,
        limit,
        total: totalResult[0]?.total || 0,
      },
      data: users,
    };

    /* -----------------------------
     * 6️⃣ Save to Redis (TTL)
     * ----------------------------- */
    await redis.setex(
      cacheKey,
      60 * 2, // ⏱ 2 minutes (admin-safe)
      JSON.stringify(response)
    );

    return res.status(200).json({
      success: true,
      message: "GET ALL Users List",
      ...response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/* ============================================
 * SAMPLE GET ALL USERS – ADMIN
 * ============================================ */
// module.exports.SampleGETallUser = async (req, res) => {
//   try {
//     const page = Math.max(parseInt(req.query.page) || 1, 1);
//     const limit = Math.min(parseInt(req.query.limit) || 20, 100);
//     const skip = (page - 1) * limit; // 1️⃣ Calculate skip
//     const search = req.query.search?.trim();

//     const baseMatch = { role: "USER" };
//     if (req.query.accountStatus)
//       baseMatch.accountStatus = req.query.accountStatus;
//     if (req.query.isPremium)
//       baseMatch.isPremium = req.query.isPremium === "true";

//     if (req.query.isBanned !== undefined) {
//       baseMatch["banDetails.isBanned"] = req.query.isBanned === "true";
//     }

//     const searchRegex = search
//       ? new RegExp(search.replace(/[.*+?^${}()|[\\/]\\]/g, "\\$&"), "i")
//       : null;

//     const pipeline = [
//       { $match: baseMatch },

//       {
//         $lookup: {
//           from: "profiles",
//           localField: "_id",
//           foreignField: "userId",
//           as: "profile",
//         },
//       },
//       { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: "accounts",
//           localField: "_id",
//           foreignField: "userId",
//           as: "account",
//         },
//       },
//       { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },

//       ...(searchRegex
//         ? [
//             {
//               $match: {
//                 $or: [
//                   // User Model Search
//                   { email: searchRegex },
//                   { phone: searchRegex },
//                   { accountStatus: searchRegex },
//                   { authMethod: searchRegex },

//                   // Profile Model Search
//                   { "profile.nickname": searchRegex },
//                   { "profile.gender": searchRegex },
//                   { "profile.jobTitle": searchRegex },
//                   { "profile.company": searchRegex },
//                   { "profile.attributes.zodiac": searchRegex },
//                   { "profile.attributes.religion": searchRegex },
//                   { "profile.attributes.interests": searchRegex },
//                   { "profile.attributes.languages": searchRegex },
//                   { "profile.discovery.relationshipGoal": searchRegex },
//                   { "profile.verification.status": searchRegex },
//                   { "profile.location.city": searchRegex },
//                   { "profile.location.country": searchRegex },
//                 ],
//               },
//             },
//             /* -----------------------------------------------------------
//              * 4️⃣ SEARCH RANKING (Score results by relevance)
//              * ----------------------------------------------------------- */
//             {
//               $addFields: {
//                 searchScore: {
//                   $sum: [
//                     {
//                       $cond: [
//                         {
//                           $regexMatch: {
//                             input: { $ifNull: ["$profile.nickname", ""] },
//                             regex: searchRegex,
//                           },
//                         },
//                         10,
//                         0,
//                       ],
//                     },
//                     {
//                       $cond: [
//                         {
//                           $regexMatch: {
//                             input: { $ifNull: ["$account.email", ""] },
//                             regex: searchRegex,
//                           },
//                         },
//                         8,
//                         0,
//                       ],
//                     },
//                     {
//                       $cond: [
//                         {
//                           $regexMatch: {
//                             input: { $ifNull: ["$profile.jobTitle", ""] },
//                             regex: searchRegex,
//                           },
//                         },
//                         5,
//                         0,
//                       ],
//                     },
//                   ],
//                 },
//               },
//             },
//             { $sort: { searchScore: -1, createdAt: -1 } },
//           ]
//         : [{ $sort: { createdAt: -1 } }]),
//       // []),

//       /* -----------------------------------------------------------
//        * 5️⃣ FACET FOR PAGINATION & PROJECTION
//        * ----------------------------------------------------------- */
//       {
//         $facet: {
//           data: [
//             { $sort: searchRegex ? { searchScore: -1 } : { createdAt: -1 } },
//             { $skip: skip }, // 2️⃣ Enable Skip
//             { $limit: limit },
//             {
//               $project: {
//                 _id: 1,
//                 role: 1,
//                 account: {
//                   status: "$accountStatus",
//                   isPremium: "$isPremium",
//                   phone: "$phone",
//                   email: "$email",
//                   authMethod: "$authMethod",
//                   banDetails: "$banDetails",
//                   deactivationDetails: "$deactivationDetails",
//                   deletionDetails: "$deletionDetails",
//                   createdAt: "$createdAt",
//                 },
//                 profile: {
//                   profileId: "$profile._id",
//                   nickname: "$profile.nickname",
//                   dob: "$profile.dob",
//                   age: "$profile.age",
//                   gender: "$profile.gender",
//                   height: "$profile.height",
//                   about: "$profile.about",
//                   jobTitle: "$profile.jobTitle",
//                   company: "$profile.company",
//                   totalCompletion:
//                     "$profile.onboardingProgress.totalCompletion",
//                 },
//                 attributes: {
//                   zodiac: "$profile.attributes.zodiac",
//                   education: "$profile.attributes.education",
//                   familyPlans: "$profile.attributes.familyPlans",
//                   personalityType: "$profile.attributes.personalityType",
//                   communicationStyle: "$profile.attributes.communicationStyle",
//                   loveStyle: "$profile.attributes.loveStyle",
//                   pets: "$profile.attributes.pets",
//                   drinking: "$profile.attributes.drinking",
//                   smoking: "$profile.attributes.smoking",
//                   workout: "$profile.attributes.workout",
//                   dietary: "$profile.attributes.dietary",
//                   sleeping: "$profile.attributes.sleeping",
//                   socialMedia: "$profile.attributes.socialMedia",
//                   languages: "$profile.attributes.languages",
//                   interests: "$profile.attributes.interests",
//                   music: "$profile.attributes.music",
//                   movies: "$profile.attributes.movies",
//                   books: "$profile.attributes.books",
//                   travel: "$profile.attributes.travel",
//                   religion: "$profile.attributes.religion",
//                 },
//                 discovery: {
//                   distanceRange: "$profile.discovery.distanceRange",
//                   ageRange: "$profile.discovery.ageRange",
//                   showMeGender: "$profile.discovery.showMeGender",
//                   relationshipGoal: "$profile.discovery.relationshipGoal",
//                   globalVisibility: "$profile.discovery.globalVisibility",
//                 },
//                 discoveryFilters: "$profile.discoveryFilters",
//                 location: "$profile.location",
//                 photos: "$profile.photos",
//                 verification: "$profile.verification",
//                 createdAt: 1,
//                 lastProfileUpdate: "$profile.lastProfileUpdate",
//                 isPhoneVerified: 1,
//                 isEmailVerified: 1,
//               },
//             },
//           ],
//           total: [{ $count: "count" }],
//         },
//       },
//     ];

//     // console.log("searchRegex: ", searchRegex);

//     const result = await User.aggregate(pipeline);
//     const users = result[0]?.data || [];
//     const total = result[0]?.total[0]?.count || 0;

//     return res.status(200).json({
//       success: true,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//       data: users,
//     });
//   } catch (error) {
//     console.error("GET USER LIST ERROR:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch users" });
//   }
// };

module.exports.SampleGETallUser = async (req, res) => {
  try {
    const {
      page: reqPage,
      limit: reqLimit,
      search,
      accountStatus,
      isPremium,
      isBanned,
    } = req.query;

    // 1. Generate a unique cache key based on query params
    // const cacheKey = `users:list:${JSON.stringify({
    //   reqPage,
    //   reqLimit,
    //   search,
    //   accountStatus,
    //   isPremium,
    //   isBanned,
    // })}`;

    // 2. Try to fetch from Redis
    // const cachedData = await redis.get(cacheKey);
    // if (cachedData) {
    //   console.log("CACHE HIT");
    //   return res.status(200).json({
    //     success: true,
    //     cached: true,
    //     ...JSON.parse(cachedData),
    //   });
    // }

    // --- YOUR EXISTING LOGIC START ---
    const page = Math.max(parseInt(reqPage) || 1, 1);
    const limit = Math.min(parseInt(reqLimit) || 20, 100);
    const skip = (page - 1) * limit;
    const searchTrimmed = search?.trim();

    const baseMatch = { role: "USER" };
    if (accountStatus) baseMatch.accountStatus = accountStatus;
    if (isPremium) baseMatch.isPremium = isPremium === "true";
    if (isBanned !== undefined)
      baseMatch["banDetails.isBanned"] = isBanned === "true";

    const searchRegex = searchTrimmed
      ? new RegExp(searchTrimmed.replace(/[.*+?^${}()|[\\/]\\]/g, "\\$&"), "i")
      : null;

    // Your Pipeline (Keeping your existing pipeline structure)
    const pipeline = [
      { $match: baseMatch },
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
        $lookup: {
          from: "accounts",
          localField: "_id",
          foreignField: "userId",
          as: "account",
        },
      },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      ...(searchRegex
        ? [
            {
              $match: {
                $or: [
                  { email: searchRegex },
                  { "profile.nickname": searchRegex },
                ],
              },
            }, // Simplified for brevity, use your full list
            {
              $addFields: {
                searchScore: {
                  $sum: [
                    {
                      $cond: [
                        {
                          $regexMatch: {
                            input: { $ifNull: ["$profile.nickname", ""] },
                            regex: searchRegex,
                          },
                        },
                        10,
                        0,
                      ],
                    },
                    {
                      $cond: [
                        {
                          $regexMatch: {
                            input: { $ifNull: ["$account.email", ""] },
                            regex: searchRegex,
                          },
                        },
                        8,
                        0,
                      ],
                    },
                    {
                      $cond: [
                        {
                          $regexMatch: {
                            input: { $ifNull: ["$profile.jobTitle", ""] },
                            regex: searchRegex,
                          },
                        },
                        5,
                        0,
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { searchScore: -1, createdAt: -1 } },
          ]
        : [{ $sort: { createdAt: -1 } }]),
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
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
                  createdAt: "$createdAt",
                },
                profile: {
                  profileId: "$profile._id",
                  nickname: "$profile.nickname",
                  dob: "$profile.dob",
                  age: "$profile.age",
                  gender: "$profile.gender",
                  height: "$profile.height",
                  about: "$profile.about",
                  jobTitle: "$profile.jobTitle",
                  company: "$profile.company",
                  totalCompletion:
                    "$profile.onboardingProgress.totalCompletion",
                },
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
                },
                discovery: {
                  distanceRange: "$profile.discovery.distanceRange",
                  ageRange: "$profile.discovery.ageRange",
                  showMeGender: "$profile.discovery.showMeGender",
                  relationshipGoal: "$profile.discovery.relationshipGoal",
                  globalVisibility: "$profile.discovery.globalVisibility",
                },
                discoveryFilters: "$profile.discoveryFilters",
                location: "$profile.location",
                photos: "$profile.photos",
                verification: "$profile.verification",
                createdAt: 1,
                lastProfileUpdate: "$profile.lastProfileUpdate",
                isPhoneVerified: 1,
                isEmailVerified: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await User.aggregate(pipeline);
    const users = result[0]?.data || [];
    const total = result[0]?.total[0]?.count || 0;

    const responseData = {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: users,
    };
    // --- YOUR EXISTING LOGIC END ---

    // 3. Save to Redis with an expiration time (e.g., 5 minutes / 300 seconds)
    // await redis.set(cacheKey, responseData, "EX", 300);

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

/* ============================================
 * For GET SINGLE USER DETAILS – ADMIN:-
 * API 2: GET api/v1/admin/user-management/:userId
 ============================================ */
//  Pending This API/.
module.exports.GETSingleUserDetails = async (req, res) => {
  try {
    /* -----------------------------
     * 1️⃣ Params Validation
     * ----------------------------- */
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    /* -----------------------------
     * 2️⃣ Aggregation Pipeline
     * ----------------------------- */
    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
          // _id: userId,
          role: "USER",
        },
      },

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
        $project: {
          _id: 1,
          role: 1,

          /* ---------------- ACCOUNT ---------------- */
          account: {
            status: "$accountStatus",
            isPremium: "$isPremium",
            phone: "$phone",
            email: "$email",
            authMethod: "$authMethod",
            banDetails: "$banDetails",
            deactivationDetails: "$deactivationDetails",
            deletionDetails: "$deletionDetails",
            createdAt: "$createdAt",
          },

          /* ---------------- PROFILE ---------------- */
          profile: {
            profileId: "$profile._id",
            nickname: "$profile.nickname",
            dob: "$profile.dob",
            age: "$profile.age",
            gender: "$profile.gender",
            height: "$profile.height",
            about: "$profile.about",
            jobTitle: "$profile.jobTitle",
            company: "$profile.company",
            totalCompletion: "$profile.onboardingProgress.totalCompletion",
          },

          /* ---------------- ATTRIBUTES ---------------- */
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
          },

          /* ---------------- DISCOVERY ---------------- */
          discovery: {
            distanceRange: "$profile.discovery.distanceRange",
            ageRange: "$profile.discovery.ageRange",
            showMeGender: "$profile.discovery.showMeGender",
            relationshipGoal: "$profile.discovery.relationshipGoal",
            globalVisibility: "$profile.discovery.globalVisibility",
          },

          discoveryFilters: "$profile.discoveryFilters",

          /* ---------------- LOCATION ---------------- */
          location: "$profile.location",

          /* ---------------- PHOTOS ---------------- */
          photos: "$profile.photos",

          /* ---------------- VERIFICATION ---------------- */
          verification: "$profile.verification",

          /* ---------------- META ---------------- */
          createdAt: 1,
          lastProfileUpdate: "$profile.lastProfileUpdate",
          isPhoneVerified: 1,
          isEmailVerified: 1,
        },
      },
    ];

    /* -----------------------------
     * 3️⃣ Execute Query
     * ----------------------------- */
    const result = await User.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* -----------------------------
     * 4️⃣ Response
     * ----------------------------- */
    return res.status(200).json({
      success: true,
      message: "Get User Detail",
      data: result[0],
    });
  } catch (error) {
    console.error("GET SINGLE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};

/* ============================================
 * For Update Single User Detail:- 
 * API 3: PATCH api/v1/admin/user-management/:userId 
 * ----- PATCH api/v1/admin/user-management/:userId/status
 ============================================ */
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
        detail.message.replace(/"/g, "")
      );
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: errorMessages,
      });
    }

    // Use 'value' (sanitized data) instead of 'req.body'
    const { accountStatus, isPremium, profile } = value;

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
      { new: true, session }
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

      // Map Nested Objects (Attributes/Location) using Dot Notation
      ["attributes", "location"].forEach((parentKey) => {
        if (profile[parentKey]) {
          Object.keys(profile[parentKey]).forEach((childKey) => {
            profileUpdate[`${parentKey}.${childKey}`] =
              profile[parentKey][childKey];
          });
        }
      });

      if (Object.keys(profileUpdate).length > 0) {
        profileUpdate.lastProfileUpdate = new Date();
        updatedProfile = await Profile.findOneAndUpdate(
          { userId },
          { $set: profileUpdate },
          { new: true, runValidators: true, session }
        );
      }
    }

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
    if (session.inAtomicity()) await session.abortTransaction();
    console.error("UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/*
 * ==== PATCH api/v1/admin/user-management/:userId/status
 */
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
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

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

/* ============================================
 * For Bluk exports in csv file to get all Users Data:-
 * API 4: GET api/v1/admin/user-management/export
 ============================================ */
module.exports.GETExportAllUsers = async (req, res) => {
  try {
    // 1️⃣ CHANGE: Use req.query for GET requests (req.body is often empty in GET)
    const filters = req.query || {};

    // USER MATCH
    const userMatch = { role: "USER" };
    if (filters.accountStatus) userMatch.accountStatus = filters.accountStatus;
    if (filters.isPremium !== undefined)
      userMatch.isPremium = filters.isPremium === "true";

    // PROFILE MATCH
    const profileMatch = {};
    if (filters.gender) profileMatch["profile.gender"] = filters.gender;

    // FILE SETUP
    const fileName = `users_export_${Date.now()}.csv`;
    const exportDir = path.join(__dirname, "../../../exports");
    const filePath = path.join(exportDir, fileName);

    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const writableStream = fs.createWriteStream(filePath);
    const csvStream = stringify({
      header: true,
      columns: [
        "UserId",
        "Email",
        "Phone",
        "AccountStatus",
        "IsPremium",
        "AuthMethod",
        "CreatedAt",
        "Nickname",
        "Gender",
        "Age",
        "JobTitle",
        "City",
        "ProfileCompletion",
        "KYCStatus",
      ],
    });

    csvStream.pipe(writableStream);

    // AGGREGATION CURSOR
    const cursor = User.aggregate([
      { $match: userMatch },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      ...(Object.keys(profileMatch).length ? [{ $match: profileMatch }] : []),
      {
        $project: {
          _id: 1,
          email: 1,
          phone: 1,
          accountStatus: 1,
          isPremium: 1,
          authMethod: 1,
          createdAt: 1,
          nickname: "$profile.nickname",
          gender: "$profile.gender",
          age: "$profile.age",
          jobTitle: "$profile.jobTitle",
          city: "$profile.location.city",
          profileCompletion: "$profile.onboardingProgress.totalCompletion",
          kycStatus: "$profile.verification.status",
        },
      },
    ]).cursor({ batchSize: 1000 });

    // STREAM DATA
    for await (const doc of cursor) {
      // 🛡️ SAFETY CHECK: Handle the Date properly
      const formattedDate =
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : doc.createdAt
          ? new Date(doc.createdAt).toISOString()
          : "";

      csvStream.write({
        UserId: doc._id.toString(),
        Email: doc.email || "",
        Phone: doc.phone || "",
        AccountStatus: doc.accountStatus,
        IsPremium: doc.isPremium ? "Yes" : "No",
        AuthMethod: doc.authMethod,
        CreatedAt: formattedDate, // Use the safe date string
        Nickname: doc.nickname || "",
        Gender: doc.gender || "",
        Age: doc.age || "",
        JobTitle: doc.jobTitle || "",
        City: doc.city || "",
        ProfileCompletion: `${doc.profileCompletion || 0}%`,
        KYCStatus: doc.kycStatus || "not_started",
      });
    }

    csvStream.end();

    return new Promise((resolve, reject) => {
      writableStream.on("finish", () => {
        res.status(200).json({
          success: true,
          message: "User export completed successfully",
          fileName: fileName,
          downloadUrl: `/api/v1/admin/user-management/download/${fileName}`,
        });
        resolve();
      });
      writableStream.on("error", (err) => reject(err));
    });
  } catch (error) {
    console.error("EXPORT USERS ERROR:", error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to export users" });
    }
  }
};

// module.exports.streamUsersExport = async (req, res) => {
//   try {
//     const filters = req.query || {};
//     const userMatch = { role: "USER" };
//     // Add other filter logic here...

//     const totalUsers = await User.countDocuments(userMatch);
//     if (totalUsers === 0) return res.status(404).send("No users found");

//     let processed = 0;

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=users_export_${Date.now()}.csv`
//     );
//     res.setHeader("Content-Type", "text/csv");
//     // Disable compression/buffering for real-time streaming progress
//     res.setHeader("X-Content-Type-Options", "nosniff");

//     const csvStream = stringify({
//       header: true,
//       columns: [
//         "UserId",
//         "Email",
//         "Phone",
//         "AccountStatus",
//         "IsPremium",
//         "CreatedAt",
//       ],
//     });

//     // We don't pipe directly to 'res' because we need to inject progress markers
//     csvStream.on("data", (chunk) => {
//       res.write(chunk);
//     });

//     const cursor = User.find(userMatch).cursor({ batchSize: 1000 });

//     for await (const user of cursor) {
//       processed++;

//       const row = {
//         UserId: user._id.toString(),
//         Email: user.email || "",
//         Phone: user.phone || "",
//         AccountStatus: user.accountStatus,
//         IsPremium: user.isPremium ? "Yes" : "No",
//         CreatedAt: user.createdAt ? user.createdAt.toISOString() : "",
//       };

//       csvStream.write(row);

//       // Send progress every 100 records to avoid flooding the stream
//       if (processed % 100 === 0 || processed === totalUsers) {
//         const progress = Math.round((processed / totalUsers) * 100);
//         // We use a unique separator that's unlikely to be in user data
//         res.write(`\n---PROGRESS:${progress}---\n`);
//       }
//     }

//     csvStream.end();
//     csvStream.on("end", () => res.end());
//   } catch (err) {
//     console.error("EXPORT STREAM ERROR:", err);
//     if (!res.headersSent) res.status(500).send("Export failed");
//     else res.end();
//   }
// };

// module.exports.streamUsersExport = async (req, res) => {
//   try {
//     const filters = req.query || {};

//     // 1. Setup Matches (Same logic as your reference API)
//     const userMatch = { role: "USER" };
//     if (filters.accountStatus) userMatch.accountStatus = filters.accountStatus;
//     if (filters.isPremium !== undefined)
//       userMatch.isPremium = filters.isPremium === "true";

//     const profileMatch = {};
//     if (filters.gender) profileMatch["profile.gender"] = filters.gender;

//     // 2. Get total count for Progress Bar
//     const totalUsers = await User.countDocuments(userMatch);
//     let processed = 0;

//     // 3. Set CSV Headers
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=users_export_${Date.now()}.csv`
//     );
//     res.setHeader("Content-Type", "text/csv");
//     res.setHeader("X-Content-Type-Options", "nosniff");

//     const csvStream = stringify({
//       header: true,
//       columns: [
//         "UserId",
//         "Email",
//         "Phone",
//         "AccountStatus",
//         "IsPremium",
//         "AuthMethod",
//         "CreatedAt",
//         "Nickname",
//         "Gender",
//         "Age",
//         "JobTitle",
//         "City",
//         "ProfileCompletion",
//         "KYCStatus",
//       ],
//     });

//     // Write CSV data directly to the response stream
//     csvStream.on("data", (chunk) => res.write(chunk));

//     // 4. Aggregation Pipeline
//     const cursor = User.aggregate([
//       { $match: userMatch },
//       {
//         $lookup: {
//           from: "profiles", // Ensure this matches your MongoDB collection name
//           localField: "_id",
//           foreignField: "userId",
//           as: "profile",
//         },
//       },
//       { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
//       ...(Object.keys(profileMatch).length ? [{ $match: profileMatch }] : []),
//       {
//         $project: {
//           _id: 1,
//           email: 1,
//           phone: 1,
//           accountStatus: 1,
//           isPremium: 1,
//           authMethod: 1,
//           createdAt: 1,
//           nickname: "$profile.nickname",
//           gender: "$profile.gender",
//           age: "$profile.age",
//           jobTitle: "$profile.jobTitle",
//           city: "$profile.location.city",
//           profileCompletion: "$profile.onboardingProgress.totalCompletion",
//           kycStatus: "$profile.verification.status",
//         },
//       },
//     ]).cursor({ batchSize: 1000 });

//     for await (const doc of cursor) {
//       processed++;

//       // Safe Date Formatting
//       const formattedDate = doc.createdAt
//         ? new Date(doc.createdAt).toISOString().split("T")[0]
//         : "";

//       csvStream.write({
//         UserId: doc._id.toString(),
//         Email: doc.email || "",
//         Phone: doc.phone || "",
//         AccountStatus: doc.accountStatus,
//         IsPremium: doc.isPremium ? "Yes" : "No",
//         AuthMethod: doc.authMethod || "phone",
//         CreatedAt: formattedDate,
//         Nickname: doc.nickname || "",
//         Gender: doc.gender || "",
//         Age: doc.age || "",
//         JobTitle: doc.jobTitle || "",
//         City: doc.city || "",
//         ProfileCompletion: `${doc.profileCompletion || 0}%`,
//         KYCStatus: doc.kycStatus || "not_started",
//       });

//       // 🔄 Write progress marker safely (Using a unique separator)
//       if (processed % 100 === 0 || processed === totalUsers) {
//         const progress = Math.round((processed / totalUsers) * 100);
//         res.write(`\n---PROG:${progress}---\n`);
//       }
//     }

//     csvStream.end();
//     csvStream.on("finish", () => res.end());
//   } catch (error) {
//     console.error("STREAM EXPORT ERROR:", error);
//     if (!res.headersSent) res.status(500).send("Export failed");
//     else res.end();
//   }
// };

module.exports.streamUsersExport = async (req, res) => {
  try {
    const filters = req.query || {};

    // 1. Matches for both collections
    const userMatch = { role: "USER" };
    if (filters.accountStatus) userMatch.accountStatus = filters.accountStatus;

    const profileMatch = {};
    if (filters.gender) profileMatch["profile.gender"] = filters.gender;

    const totalUsers = await User.countDocuments(userMatch);
    let processed = 0;

    // 2. HTTP Headers for Direct Download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=users_export_${Date.now()}.csv`
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const csvStream = stringify({
      header: true,
      columns: [
        "UserId",
        "Email",
        "Phone",
        "AccountStatus",
        "IsPremium",
        "AuthMethod",
        "CreatedAt",
        "Nickname",
        "Gender",
        "Age",
        "JobTitle",
        "City",
        "ProfileCompletion",
        "KYCStatus",
      ],
    });

    // Pipe CSV chunks directly to the HTTP response
    csvStream.on("data", (chunk) => res.write(chunk));

    // 3. The Join (User + Profile)
    const cursor = User.aggregate([
      { $match: userMatch },
      {
        $lookup: {
          from: "profiles", // Verify this is your actual collection name
          localField: "_id",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      ...(Object.keys(profileMatch).length ? [{ $match: profileMatch }] : []),
      {
        $project: {
          _id: 1,
          email: 1,
          phone: 1,
          accountStatus: 1,
          isPremium: 1,
          authMethod: 1,
          createdAt: 1,
          nickname: "$profile.nickname",
          gender: "$profile.gender",
          age: "$profile.age",
          jobTitle: "$profile.jobTitle",
          city: "$profile.location.city",
          profileCompletion: "$profile.onboardingProgress.totalCompletion",
          kycStatus: "$profile.verification.status",
        },
      },
    ]).cursor({ batchSize: 1000 });

    for await (const doc of cursor) {
      processed++;

      csvStream.write({
        UserId: doc._id.toString(),
        Email: doc.email || "",
        Phone: doc.phone || "",
        AccountStatus: doc.accountStatus,
        IsPremium: doc.isPremium ? "Yes" : "No",
        AuthMethod: doc.authMethod || "phone",
        CreatedAt: doc.createdAt
          ? new Date(doc.createdAt).toISOString().split("T")[0]
          : "",
        Nickname: doc.nickname || "",
        Gender: doc.gender || "",
        Age: doc.age || "",
        JobTitle: doc.jobTitle || "",
        City: doc.city || "",
        ProfileCompletion: `${doc.profileCompletion || 0}%`,
        KYCStatus: doc.kycStatus || "not_started",
      });

      // Send progress marker
      if (processed % 50 === 0 || processed === totalUsers) {
        const prog = Math.round((processed / totalUsers) * 100);
        res.write(`\n---PROG:${prog}---\n`);
      }
    }

    csvStream.end();
    csvStream.on("finish", () => res.end());
  } catch (error) {
    console.error("STREAM EXPORT ERROR:", error);
    if (!res.headersSent) res.status(500).send("Export failed");
    else res.end();
  }
};
