const UserAuth = require("../auth/auth.model");
const Profile = require("./profile.model");

module.exports.updateBasicInfo = async (userId, data) => {
  const profile = await Profile.findOneAndUpdate(
    { userId },
    data,
    { new: true, upsert: true }
  );
  return profile;
};

module.exports.updateLocation = async (userId, data) => {
  const location = {
    type: "Point",
    coordinates: [data.longitude, data.latitude],
    city: data.city || "",
    country: data.country || ""
  };

  const profile = await Profile.findOneAndUpdate(
    { userId },
    { location },
    { new: true, upsert: true }
  );
  
  return profile;
};

module.exports.updateInterests = async (userId, data) => {
  return await Profile.findOneAndUpdate(
    { userId },
    { interests: data.interests },
    { new: true, upsert: true }
  );
};

module.exports.updatePreferences = async (userId, data) => {
  return await Profile.findOneAndUpdate(
    { userId },
    { preferences: data },
    { new: true, upsert: true }
  );
};

module.exports.uploadPhoto = async (userId, data) => {
  return await Profile.findOneAndUpdate(
    { userId },
    { $push: { photos: data } },
    { new: true, upsert: true }
  );
};

module.exports.markProfileCompleted = async (userId) => {
  await UserAuth.findByIdAndUpdate(userId, {
    isProfileCompleted: true
  });

  return { completed: true };
};


module.exports.formatProfileResponse = (profile, user = {}) => {
  return {
    _id: profile._id,
    userId: profile.userId,
    __v: profile.__v || 0,

    bookPreference: profile.bookPreference || [],
    canAccessSwipe: profile.canAccessSwipe ?? false,

    // 🔹 Flatten discoveryFilters
    basics: profile.discoveryFilters?.basics || {
      PersonalityType: [],
      communicationStyle: [],
      education: [],
      familyPlans: [],
      loveStyle: [],
      zodiac: []
    },

    interests: profile.interests || [],

    lifestyle: profile.discoveryFilters?.lifestyle || {
      drinking: [],
      exercise: [],
      pets: [],
      smokingHabits: []
    },

    relationshipGoal: {
  key: profile.relationshipGoal?.key || "",
  title: profile.relationshipGoal?.title || "",
  subtitle: profile.relationshipGoal?.subtitle || ""
},

    isDiscoverable: profile.isDiscoverable ?? false,
    isMandatoryComplete: profile.isMandatoryComplete ?? false,
    isProfileComplete: profile.isProfileComplete ?? false,

    // 🔹 KYC normalize
    // kyc: [
    //   {
    //     type: "selfie",
    //     status: profile.kyc?.status || "",
    //     reason: ""
    //   },
    //   {
    //     type: "doc",
    //     status: profile.kyc?.status || "",
    //     reason: ""
    //   }
    // ],


    kyc: [
  {
    type: "selfie",
    status: profile.kyc?.selfie?.url
      ? profile.kyc.status
      : "not_started",
    reason: profile.kyc?.rejectionReason || ""
  },
  {
    type: "doc",
    status: profile.kyc?.idDocument?.frontUrl
      ? profile.kyc.status
      : "not_started",
    reason: profile.kyc?.rejectionReason || ""
  }
],

    languages: profile.languages || [],

    // location: {
    //   coordinates: profile.location?.coordinates || [0, 0],
    //   address: profile.location?.address || "",
    //   type: "Point"
    // },

    location: {
  coordinates: profile.location?.coordinates || [0, 0],
  address: [
    profile.location?.city,
    profile.location?.state,
    profile.location?.country
  ].filter(Boolean).join(", "),
  type: "Point"
},

    moviePreference: profile.moviePreference || [],
    musicPreference: profile.musicPreference || [],

    totalCompletion: profile.onboardingProgress?.totalCompletion || 0,

    photos:
      profile.photos?.length
        ? profile.photos
        : [{ id: "", order: "", url: "" }],

    account_status: {
      isBlocked: false,
      reason: ""
    },

    email: user.email || "",
    phone_no: user.phone || "",

    nickname: profile.nickname || "",
    height: profile.height || "",
    jobtitle: profile.jobtitle || "",
    occiupation: profile.occupation || "",
    about_me: profile.bio || "",
    company: profile.company || "",
    school: profile.school || "",

    visibility: profile.visibility || "everyone",
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    lastProfileUpdate: profile.updatedAt
  };
};
