/* eslint-disable no-unused-vars */
const axios = require("axios");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const {
  AU_CITIES,
  INTERESTS_POOL,
  BIOS_POOL,
  RELATIONSHIP_GOALS,
  getRandom,
  getRandomItems,
  getRandomAttributes,
  generateRandomPhone,
  generateRandomEmail,
  getPortrait,
  getLifestyle,
  hashPhone,
} = require("./fakeProfile.helpers");

const calculateAge = (dob) => {
  const diff = Date.now() - new Date(dob).getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const bulkCreateFakeProfiles = async ({
  count,
  gender,
  ageRange,
  city,
  adminId,
}) => {
  const batchId = `batch_${Date.now()}`;

  // 1. Fetch names from randomuser.me (Fastest way to get realistic names/DOBs)
  // Map gender for randomuser API names
  const apiGender =
    gender === "men" || gender === "trans-man"
      ? "male"
      : gender === "women" || gender === "trans-women"
        ? "female"
        : "";

  const apiUrl = apiGender
    ? `https://randomuser.me/api/?results=${count}&gender=${apiGender}&nat=au`
    : `https://randomuser.me/api/?results=${count}&nat=au`;

  let apiUsers = [];
  try {
    const response = await axios.get(apiUrl, { timeout: 5000 });
    apiUsers = response.data?.results || [];
  } catch (err) {
    console.warn(
      "RandomUser API failed, falling back to local generation",
      err.message,
    );
  }

  // ── FALLBACK LOGIC if API is down or returned empty `[]` ("d3adb33f" seed bug) ──
  if (!apiUsers || apiUsers.length === 0) {
    const fallbackMen = [
      "James",
      "William",
      "Oliver",
      "Jack",
      "Noah",
      "Thomas",
      "Lucas",
      "Liam",
      "Ethan",
      "Mason",
    ];
    const fallbackWomen = [
      "Charlotte",
      "Olivia",
      "Amelia",
      "Mia",
      "Isla",
      "Ava",
      "Chloe",
      "Grace",
      "Harper",
      "Sophia",
    ];

    for (let i = 0; i < count; i++) {
      const isMaleFallback =
        apiGender === "male" || (!apiGender && Math.random() > 0.5);
      const namesPool = isMaleFallback ? fallbackMen : fallbackWomen;
      const randomName = getRandom(namesPool) + Math.floor(Math.random() * 100); // add number for uniqueness

      // random DOB between ageRange min and max (fallback to 22-35 if not provided)
      const minAge = ageRange?.min || 22;
      const maxAge = ageRange?.max || 35;
      const randomAge =
        Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - randomAge);
      dob.setMonth(Math.floor(Math.random() * 12));
      dob.setDate(Math.floor(Math.random() * 28) + 1);

      apiUsers.push({
        name: { first: randomName },
        dob: { date: dob.toISOString() },
      });
    }
  }

  // 2. Prepare User Objects
  const userObjects = apiUsers.map((apiUser) => {
    const phone = generateRandomPhone();
    return {
      phone,
      phoneHash: hashPhone(phone),
      email: generateRandomEmail(apiUser.name.first),
      isPhoneVerified: true,
      isEmailVerified: true,
      authMethod: "phone",
      role: "USER",
      accountStatus: "active",
      isNewUser: false,
      isProfileCompleted: true,
      isFake: true,
      fakeProfileMeta: {
        createdByAdmin: adminId,
        batchId: batchId,
      },
      onboarding: { isComplete: true },
    };
  });

  // ⚡ Fast Bulk Insert Users
  const createdUsers = await User.insertMany(userObjects);

  // 3. Prepare Profile Objects
  const locationData = AU_CITIES[city];
  const profileObjects = createdUsers.map((user, index) => {
    const apiUser = apiUsers[index];
    const dob = new Date(apiUser.dob.date);

    // High Quality Photos
    const portraitUrl = getPortrait(gender);
    const profilePhotos = [
      { url: portraitUrl, order: 0, uploadedAt: new Date() },
    ];

    // Add lifestyle photos
    for (let i = 1; i <= 4; i++) {
      profilePhotos.push({
        url: getLifestyle(),
        order: i,
        uploadedAt: new Date(),
      });
    }

    return {
      userId: user._id,
      nickname: apiUser.name.first,
      dob: dob,
      age: calculateAge(dob),
      gender: gender,
      about: getRandom(BIOS_POOL),
      jobTitle: "Creative",
      photos: profilePhotos,
      location: {
        type: "Point",
        coordinates: [locationData.lng, locationData.lat],
        city: city,
        state: locationData.state,
        country: "Australia",
      },
      discovery: {
        globalVisibility: "everyone",
        relationshipGoal: getRandom(RELATIONSHIP_GOALS),
        showMeGender: [gender === "men" ? "women" : "everyone"],
      },
      attributes: {
        ...getRandomAttributes(),
        interests: getRandomItems(INTERESTS_POOL, 5),
      },
      verification: {
        status: "approved",
        verifiedAt: new Date(),
        verifiedBy: adminId,
        selfieUrl: portraitUrl,
      },
      onboardingProgress: {
        phoneVerified: true,
        emailVerified: true,
        nicknameSet: true,
        dobSet: true,
        genderSet: true,
        photosUploaded: true,
        locationSet: true,
        relationshipGoalSet: true,
        interestsSet: true,
        totalCompletion: 100,
      },
      isMandatoryComplete: true,
      isProfileComplete: true,
      onboarding: {
        isComplete: true,
        nextstep: 1,
        currentScreenSlug: "complete",
        updatedAt: new Date(),
      },
    };
  });

  // ⚡ Fast Bulk Insert Profiles
  const createdProfiles = await Profile.insertMany(profileObjects);

  // 4. Wrap for Response
  const profiles = createdUsers.map((user, index) => ({
    user,
    profile: createdProfiles[index],
  }));

  return { batchId, count: profiles.length, profiles };
};

/*====== List fake profiles with full pagination, sorting, filtering & search ======*/
const listFakeProfiles = async ({
  page,
  limit,
  gender,
  batchId,
  status,
  search,
  city,
  sortBy,
  sortOrder,
}) => {
  // ── 1. Build User query ──
  const userQuery = { isFake: true };
  if (batchId) userQuery["fakeProfileMeta.batchId"] = batchId;
  if (status && status !== "all") userQuery.accountStatus = status;

  // ── 2. Handle search & profile-level filters ──
  // If search, city, or gender filter is provided, we first query Profile collection
  // to get matching userIds, then intersect with User query
  let profileFilterUserIds = null;

  const needsProfileFilter =
    (search && search.trim()) ||
    (gender && gender !== "all") ||
    (city && city !== "all");

  if (needsProfileFilter) {
    const profileQuery = {};

    // Gender filter on Profile
    if (gender && gender !== "all") {
      profileQuery.gender = gender;
    }

    // City filter on Profile
    if (city && city !== "all") {
      profileQuery["location.city"] = city;
    }

    // Search: nickname (on Profile) + email/phone (on User)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      // Search in User model (email, phone)
      const matchedUsers = await User.find({
        isFake: true,
        $or: [{ email: searchRegex }, { phone: searchRegex }],
      })
        .select("_id")
        .lean();
      const userMatchedIds = matchedUsers.map((u) => u._id);

      // Search in Profile model (nickname, city)
      profileQuery.$or = [
        { nickname: searchRegex },
        { "location.city": searchRegex },
        { userId: { $in: userMatchedIds } },
      ];
    }

    const matchedProfiles = await Profile.find(profileQuery)
      .select("userId")
      .lean();
    profileFilterUserIds = matchedProfiles.map((p) => p.userId);

    // Intersect: only users whose _id is in profileFilterUserIds
    userQuery._id = { $in: profileFilterUserIds };
  }

  // ── 3. Sorting ──
  // For User-level sorts (createdAt, accountStatus) — sort directly
  // For Profile-level sorts (nickname, gender, city) — we fetch, join, then sort in-memory
  const userLevelSorts = ["createdAt", "accountStatus"];
  const isUserLevelSort = userLevelSorts.includes(sortBy);

  // Count total matching documents (for pagination metadata)
  const total = await User.countDocuments(userQuery);

  let users;
  if (isUserLevelSort) {
    // Direct DB sort + paginate
    const sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    users = await User.find(userQuery)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  } else {
    // For profile-level sorting, fetch all matching users first
    users = await User.find(userQuery).lean();
  }

  // ── 4. Fetch profiles for matched users ──
  const userIds = users.map((u) => u._id);
  const profiles = await Profile.find({ userId: { $in: userIds } }).lean();

  // Create profile lookup map
  const profileMap = {};
  profiles.forEach((p) => {
    profileMap[p.userId.toString()] = p;
  });

  // ── 5. Join users + profiles ──
  let combined = users.map((user) => ({
    user,
    profile: profileMap[user._id.toString()] || null,
  }));

  // ── 6. Profile-level sorting (in-memory) ──
  if (!isUserLevelSort) {
    const sortMultiplier = sortOrder === "asc" ? 1 : -1;

    combined.sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case "nickname":
          valA = (a.profile?.nickname || "").toLowerCase();
          valB = (b.profile?.nickname || "").toLowerCase();
          break;
        case "gender":
          valA = (a.profile?.gender || "").toLowerCase();
          valB = (b.profile?.gender || "").toLowerCase();
          break;
        case "city":
          valA = (a.profile?.location?.city || "").toLowerCase();
          valB = (b.profile?.location?.city || "").toLowerCase();
          break;
        default:
          valA = a.user.createdAt;
          valB = b.user.createdAt;
      }

      if (valA < valB) return -1 * sortMultiplier;
      if (valA > valB) return 1 * sortMultiplier;
      return 0;
    });

    // Manual pagination for in-memory sort
    const startIndex = (page - 1) * limit;
    combined = combined.slice(startIndex, startIndex + limit);
  }

  // ── 7. Calculate additional stats (KPIs) ──
  const fakeUserIds = await User.find({ isFake: true }).distinct("_id");
  const [activeTotal, deactivatedTotal, menCount, womenCount] =
    await Promise.all([
      User.countDocuments({ isFake: true, accountStatus: "active" }),
      User.countDocuments({ isFake: true, accountStatus: "deactivated" }),
      Profile.countDocuments({ gender: "men", userId: { $in: fakeUserIds } }),
      Profile.countDocuments({ gender: "women", userId: { $in: fakeUserIds } }),
    ]);
  const totalAll = fakeUserIds.length;

  // ── 8. Calculate pagination metadata ──
  const totalPages = Math.ceil(total / limit);

  return {
    data: combined,
    pagination: {
      total,
      totalAll,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    kpiStats: {
      totalProfiles: totalAll,
      activeTotal,
      deactivatedTotal,
      menCount,
      womenCount,
    },
  };
};

const toggleFakeProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isFake) throw new Error("Fake profile not found");

  user.accountStatus =
    user.accountStatus === "active" ? "deactivated" : "active";
  await user.save();
  return user;
};

const deleteFakeProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isFake) throw new Error("Fake profile not found");

  await Promise.all([
    User.deleteOne({ _id: userId }),
    Profile.deleteOne({ userId: userId }),
  ]);
  return { success: true };
};

module.exports = {
  bulkCreateFakeProfiles,
  listFakeProfiles,
  toggleFakeProfile,
  deleteFakeProfile,
};
