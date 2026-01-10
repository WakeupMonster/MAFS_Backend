const mongoose = require("mongoose");
const redis = require("../../../common/redis");
const User = require("../../auth/auth.model");
const { createCacheKey } = require("../../auth/auth.utils");
const Profile = require("../../profile/profile.model");
const { adminUserListSchema } = require("./user.management.validation");
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
module.exports.SampleGETallUser = async (req, res) => {
  try {
    /* -----------------------------
     * 1️⃣ Query Params
     * ----------------------------- */
    const {
      page = 1,
      limit = 20,
      search,
      accountStatus,
      isPremium,
    } = req.query;

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.min(Number(limit), 50);
    // const skip = (pageNum - 1) * limitNum;

    /* -----------------------------
     * 2️⃣ USER MATCH (Auth Model)
     * ----------------------------- */
    const userMatch = { role: "USER" };

    if (accountStatus) {
      userMatch.accountStatus = accountStatus;
    }

    if (isPremium !== undefined) {
      userMatch.isPremium = isPremium === "true";
    }

    if (search) {
      userMatch.$or = [
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    /* -----------------------------
     * 3️⃣ AGGREGATION PIPELINE
     * ----------------------------- */
    const pipeline = [
      // STEP 1: Filter users (FAST – indexed)
      { $match: userMatch },

      // STEP 2: Join profile collection
      {
        $lookup: {
          from: "profiles", // Profile collection name
          localField: "_id", // User._id
          foreignField: "userId", // Profile.userId
          as: "profile",
        },
      },

      // STEP 3: Convert profile array → object
      {
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: true,
        },
      },

      // STEP 4: Select only required fields
      {
        $project: {
          _id: 1,
          email: 1,
          isEmailVerified: 1,
          phone: 1,
          isPhoneVerified: 1,
          isProfileCompleted: 1,
          role: 1,
          accountStatus: 1,
          banDetails: 1,
          deactivationDetails: 1,
          deletionDetails: 1,
          onboarding: 1,
          isPremium: 1,
          authMethod: 1,
          createdAt: 1,

          // Profile fields
          profileId: "$profile._id",
          fullName: "$profile.fullName",
          nickname: "$profile.nickname",
          dob: "$profile.dob",
          age: "$profile.age",
          gender: "$profile.gender",

          relationshipGoal: "$profile.relationshipGoal",
          preferences: "$profile.preferences",
          discoveryFilters: "$profile.discoveryFilters",
          interests: "$profile.interests",
          photos: "$profile.photos",
          location: "$profile.location",
          languages: "$profile.languages",

          communicationStyle: "$profile.communicationStyle",
          musicPreference: "$profile.musicPreference",
          moviePreference: "$profile.moviePreference",
          bookPreference: "$profile.bookPreference",
          travelPreference: "$profile.travelPreference",

          height: "$profile.height",
          occupation: "$profile.occupation",
          company: "$profile.company",

          kyc: "$profile.kyc",

          onboardingProgress: "$profile.onboardingProgress",
          profileCompletion: "$profile.onboardingProgress.totalCompletion",

          isMandatoryComplete: "$profile.isMandatoryComplete",
          isProfileComplete: "$profile.isProfileComplete",
          canAccessSwipe: "$profile.canAccessSwipe",
          isDiscoverable: "$profile.isDiscoverable",

          lastProfileUpdate: "$profile.lastProfileUpdate",
        },
      },

      // STEP 5: Sort (latest users first)
      { $sort: { createdAt: -1 } },

      // STEP 6: Pagination
      // { $skip: skip },
      // { $limit: limitNum },
    ];

    /* -----------------------------
     * 4️⃣ COUNT QUERY (Pagination)
     * ----------------------------- */
    const countPipeline = [{ $match: userMatch }, { $count: "total" }];

    /* -----------------------------
     * 5️⃣ Execute Queries
     * ----------------------------- */
    const [users, countResult] = await Promise.all([
      User.aggregate(pipeline),
      User.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    /* -----------------------------
     * 6️⃣ Response
     * ----------------------------- */
    return res.status(200).json({
      success: true,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      data: users,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

/* ============================================
 * For GET SINGLE USER DETAILS – ADMIN:-
 * API 2: GET api/v1/admin/user-management/:userId
 ============================================ */
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
          /* -------- AUTH FIELDS -------- */
          _id: 1,
          email: 1,
          isEmailVerified: 1,
          phone: 1,
          isPhoneVerified: 1,
          role: 1,
          accountStatus: 1,
          isPremium: 1,
          authMethod: 1,
          createdAt: 1,
          updatedAt: 1,

          /* -------- PROFILE FIELDS -------- */
          profileId: "$profile._id",
          fullName: "$profile.fullName",
          nickname: "$profile.nickname",
          dob: "$profile.dob",
          age: "$profile.age",
          gender: "$profile.gender",

          relationshipGoal: "$profile.relationshipGoal",
          preferences: "$profile.preferences",
          discoveryFilters: "$profile.discoveryFilters",
          interests: "$profile.interests",
          photos: "$profile.photos",
          location: "$profile.location",
          languages: "$profile.languages",

          communicationStyle: "$profile.communicationStyle",
          musicPreference: "$profile.musicPreference",
          moviePreference: "$profile.moviePreference",
          bookPreference: "$profile.bookPreference",
          travelPreference: "$profile.travelPreference",

          height: "$profile.height",
          occupation: "$profile.occupation",
          company: "$profile.company",
          school: "$profile.school",
          about_me: "$profile.about_me",

          kyc: "$profile.kyc",

          onboardingProgress: "$profile.onboardingProgress",
          profileCompletion: "$profile.onboardingProgress.totalCompletion",

          isMandatoryComplete: "$profile.isMandatoryComplete",
          isProfileComplete: "$profile.isProfileComplete",
          canAccessSwipe: "$profile.canAccessSwipe",
          isDiscoverable: "$profile.isDiscoverable",

          lastProfileUpdate: "$profile.lastProfileUpdate",
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
    const { accountStatus, isPremium, profile } = req.body;

    /* --------------------------------
     * 1️⃣ Validate userId
     * ------------------------------- */
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    /* --------------------------------
     * 2️⃣ Build User update payload
     * ------------------------------- */
    const userUpdate = {};

    if (accountStatus) {
      userUpdate.accountStatus = accountStatus;
    }

    if (typeof isPremium === "boolean") {
      userUpdate.isPremium = isPremium;
    }

    /* --------------------------------
     * 3️⃣ Update User model
     * ------------------------------- */
    const user = await User.findOneAndUpdate(
      { _id: userId, role: "USER" },
      { $set: userUpdate },
      { new: true, session }
    );

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* --------------------------------
     * 4️⃣ Update Profile model (optional)
     * ------------------------------- */
    let updatedProfile = null;

    if (profile && typeof profile === "object") {
      const allowedProfileFields = [
        "fullName",
        "nickname",
        "gender",
        "age",
        "isDiscoverable",
        "occupation",
        "company",
      ];

      const profileUpdate = {};

      for (const key of allowedProfileFields) {
        if (profile[key] !== undefined) {
          profileUpdate[key] = profile[key];
        }
      }

      if (Object.keys(profileUpdate).length) {
        profileUpdate.lastProfileUpdate = new Date();

        updatedProfile = await Profile.findOneAndUpdate(
          { userId },
          { $set: profileUpdate },
          { new: true, session }
        );
      }
    }

    const resProfile = {
      profileId: updatedProfile._id,
      fullName: updatedProfile.fullName,
      nickname: updatedProfile.nickname,
      dob: updatedProfile.dob,
      age: updatedProfile.age,
      gender: updatedProfile.gender,
      interests: updatedProfile.interests,
      photos: updatedProfile.photos,
      relationshipGoal: updatedProfile.relationshipGoal,
      preferences: updatedProfile.preferences,
      discoveryFilters: updatedProfile.discoveryFilters,
      location: updatedProfile.location,
      kyc: updatedProfile.kyc,
      onboardingProgress: updatedProfile.onboardingProgress,
      height: updatedProfile.height,
      jobtitle: updatedProfile.jobtitle,
      about_me: updatedProfile.about_me,
      school: updatedProfile.school,
      visibility: updatedProfile.visibility,
      languages: updatedProfile.languages,
      communicationStyle: updatedProfile.communicationStyle,
      musicPreference: updatedProfile.musicPreference,
      moviePreference: updatedProfile.moviePreference,
      bookPreference: updatedProfile.bookPreference,
      travelPreference: updatedProfile.travelPreference,
      occupation: updatedProfile.occupation,
      company: updatedProfile.company,
      isMandatoryComplete: updatedProfile.isMandatoryComplete,
      isProfileComplete: updatedProfile.isProfileComplete,
      canAccessSwipe: updatedProfile.canAccessSwipe,
      isDiscoverable: updatedProfile.isDiscoverable,
      lastProfileUpdate: updatedProfile.lastProfileUpdate,
      createdAt: updatedProfile.createdAt,
      updatedAt: updatedProfile.updatedAt,
    };

    /* --------------------------------
     * 5️⃣ Commit transaction
     * ------------------------------- */
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          _id: user._id,
          accountStatus: user.accountStatus,
          isPremium: user.isPremium,
        },
        profile: resProfile,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("UPDATE USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
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
    const { filters = {} } = req.body;

    /* -----------------------------
     * USER MATCH
     * ----------------------------- */
    const userMatch = { role: "USER" };

    if (filters.accountStatus) {
      userMatch.accountStatus = filters.accountStatus;
    }

    if (filters.isPremium !== undefined) {
      userMatch.isPremium = Boolean(filters.isPremium);
    }

    /* -----------------------------
     * PROFILE MATCH
     * ----------------------------- */
    const profileMatch = {};

    if (filters.gender) {
      profileMatch["profile.gender"] = filters.gender;
    }

    /* -----------------------------
     * FILE SETUP
     * ----------------------------- */
    const fileName = `users_export_${Date.now()}.csv`;
    const filePath = path.join(__dirname, "../../../exports", fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

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
        "FullName",
        "Nickname",
        "Gender",
        "Age",
        "ProfileCompletion",
        "KYCStatus",
      ],
    });

    csvStream.pipe(writableStream);

    /* -----------------------------
     * AGGREGATION CURSOR
     * ----------------------------- */
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
          isEmailVerified: 1,
          phone: 1,
          isPhoneVerified: 1,
          isProfileCompleted: 1,
          role: 1,
          accountStatus: 1,
          isPremium: 1,
          authMethod: 1,
          createdAt: 1,

          // Profile fields
          profileId: "$profile._id",
          fullName: "$profile.fullName",
          nickname: "$profile.nickname",
          dob: "$profile.dob",
          age: "$profile.age",
          gender: "$profile.gender",

          relationshipGoal: "$profile.relationshipGoal",
          preferences: "$profile.preferences",
          discoveryFilters: "$profile.discoveryFilters",
          interests: "$profile.interests",
          photos: "$profile.photos",
          location: "$profile.location",
          languages: "$profile.languages",

          communicationStyle: "$profile.communicationStyle",
          musicPreference: "$profile.musicPreference",
          moviePreference: "$profile.moviePreference",
          bookPreference: "$profile.bookPreference",
          travelPreference: "$profile.travelPreference",

          height: "$profile.height",
          occupation: "$profile.occupation",
          company: "$profile.company",

          kyc: "$profile.kyc",

          onboardingProgress: "$profile.onboardingProgress",
          profileCompletion: "$profile.onboardingProgress.totalCompletion",

          isMandatoryComplete: "$profile.isMandatoryComplete",
          isProfileComplete: "$profile.isProfileComplete",
          canAccessSwipe: "$profile.canAccessSwipe",
          isDiscoverable: "$profile.isDiscoverable",

          lastProfileUpdate: "$profile.lastProfileUpdate",
        },
      },
    ]).cursor({ batchSize: 500 });
    // .exec();

    /* -----------------------------
     * STREAM DATA ROW BY ROW
     * ----------------------------- */
    for await (const doc of cursor) {
      csvStream.write({
        UserId: doc._id.toString(),
        Email: doc.email || "",
        Phone: doc.phone || "",
        AccountStatus: doc.accountStatus,
        IsPremium: doc.isPremium,
        AuthMethod: doc.authMethod,
        CreatedAt: doc.createdAt,
        FullName: doc.fullName || "",
        Nickname: doc.nickname || "",
        Gender: doc.gender || "",
        Age: doc.age || "",
        ProfileCompletion: doc.profileCompletion || 0,
        KYCStatus: doc.kycStatus || "pending",
      });
    }

    csvStream.end();

    /* -----------------------------
     * RESPONSE
     * ----------------------------- */
    return res.status(200).json({
      success: true,
      message: "User export started",
      file: fileName,
    });
  } catch (error) {
    console.error("EXPORT USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export users",
    });
  }
};
