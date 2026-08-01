/* eslint-disable no-unused-vars */
const axios = require("axios");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const FakeProfileCity = require("./fakeProfileCity.model");
const { calculateAge } = require("../../../common/utils/calculate.age");
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

/**
 * Resolves city location data — checks DB-added cities first, then falls back to hardcoded AU_CITIES.
 * @param {string} cityName
 * @returns {{ lat: number, lng: number, state: string }}
 */
const resolveCity = async (cityName) => {
  // 1. Check hardcoded list first (fast path)
  if (AU_CITIES[cityName]) {
    return AU_CITIES[cityName];
  }

  // 2. Check DB for admin-added cities
  const dbCity = await FakeProfileCity.findOne({ name: cityName }).lean();
  if (dbCity) {
    return { lat: dbCity.lat, lng: dbCity.lng, state: dbCity.state };
  }

  throw new Error(`City "${cityName}" is not available. Please add it first via City Management.`);
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
  const locationData = await resolveCity(city);
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
  isPremium,
}) => {
  const matchUser = { isFake: true };
  if (batchId) matchUser["fakeProfileMeta.batchId"] = batchId;
  if (status && status !== "all") matchUser.accountStatus = status;
  if (isPremium !== undefined && isPremium !== null) {
    matchUser.isPremium = isPremium === "true" || isPremium === true;
  }

  const pipeline = [
    { $match: matchUser },
    {
      $lookup: {
        from: "profiles",
        localField: "_id",
        foreignField: "userId",
        as: "profile"
      }
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } }
  ];

  const profileMatch = {};
  if (gender && gender !== "all") profileMatch["profile.gender"] = gender;
  if (city && city !== "all") profileMatch["profile.location.city"] = city;

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    profileMatch.$or = [
      { "profile.nickname": searchRegex },
      { "profile.location.city": searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }

  if (Object.keys(profileMatch).length > 0) {
    pipeline.push({ $match: profileMatch });
  }

  let sortField = "createdAt";
  if (sortBy === "nickname") sortField = "profile.nickname";
  else if (sortBy === "gender") sortField = "profile.gender";
  else if (sortBy === "city") sortField = "profile.location.city";
  else if (sortBy === "accountStatus") sortField = "accountStatus";

  const sortMultiplier = sortOrder === "asc" ? 1 : -1;
  const sortObj = { [sortField]: sortMultiplier, "_id": -1 };

  pipeline.push({ $sort: sortObj });

  const skip = (page - 1) * limit;
  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            user: "$$ROOT",
            profile: "$profile"
          }
        }
      ]
    }
  });

  const [aggResult] = await User.aggregate(pipeline);
  const total = aggResult.metadata[0]?.total || 0;
  
  const combined = aggResult.data.map(item => {
    const p = item.profile;
    delete item.user.profile;
    return {
      user: item.user,
      profile: p || null
    };
  });

  const fakeUserIds = await User.find({ isFake: true }).distinct("_id");
  const [activeTotal, deactivatedTotal, menCount, womenCount] = await Promise.all([
    User.countDocuments({ isFake: true, accountStatus: "active" }),
    User.countDocuments({ isFake: true, accountStatus: "deactivated" }),
    Profile.countDocuments({ gender: "men", userId: { $in: fakeUserIds } }),
    Profile.countDocuments({ gender: "women", userId: { $in: fakeUserIds } }),
  ]);
  const totalAll = fakeUserIds.length;
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

/*====== City Management ======*/
const addCity = async ({ name, state, lat, lng, adminId }) => {
  // Check if city already exists (hardcoded or DB)
  if (AU_CITIES[name]) {
    throw new Error(`"${name}" is already a default city and cannot be added again.`);
  }

  const existing = await FakeProfileCity.findOne({ name });
  if (existing) {
    throw new Error(`"${name}" has already been added.`);
  }

  const city = await FakeProfileCity.create({
    name,
    state,
    lat,
    lng,
    addedBy: adminId,
  });

  return city;
};

const listCities = async () => {
  // 1. Hardcoded cities
  const hardcoded = Object.entries(AU_CITIES).map(([name, data]) => ({
    _id: null,
    name,
    state: data.state,
    lat: data.lat,
    lng: data.lng,
    isDefault: true,
  }));

  // 2. DB-added cities
  const dbCities = await FakeProfileCity.find().sort({ name: 1 }).lean();
  const custom = dbCities.map((c) => ({
    _id: c._id,
    name: c.name,
    state: c.state,
    lat: c.lat,
    lng: c.lng,
    isDefault: false,
    createdAt: c.createdAt,
  }));

  return [...hardcoded, ...custom];
};

const deleteCity = async (cityId) => {
  const city = await FakeProfileCity.findById(cityId);
  if (!city) {
    throw new Error("City not found or it is a default city that cannot be deleted.");
  }

  await FakeProfileCity.deleteOne({ _id: cityId });
  return { success: true, name: city.name };
};

module.exports = {
  bulkCreateFakeProfiles,
  listFakeProfiles,
  toggleFakeProfile,
  deleteFakeProfile,
  addCity,
  listCities,
  deleteCity,
};
