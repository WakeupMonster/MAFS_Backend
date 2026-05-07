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

module.exports.formatProfileResponse = (profile, user = {}, blockedContacts = []) => {
  // Transform the new structure into the old format
  return {
    _id: profile._id,
    userId: profile.userId,
    __v: profile.__v || 0,
    bookPreference: profile.attributes?.books || [],
    // canAccessSwipe: profile.canAccessSwipe || false,
    basics: {
      PersonalityType: profile.attributes?.personalityType ? profile.attributes.personalityType : "",
      communicationStyle: profile.attributes?.communicationStyle ? profile.attributes.communicationStyle : "",
      education: profile.attributes?.education ? profile.attributes.education : "",
      familyPlans: profile.attributes?.familyPlans ? profile.attributes.familyPlans : "",
      loveStyle: profile.attributes?.loveStyle ? profile.attributes.loveStyle : "",
      zodiac: profile.attributes?.zodiac ? profile.attributes.zodiac : ""
    },
    interests: profile.attributes?.interests || [],
    lifestyle: {
      drinking: profile.attributes?.drinking ? [profile.attributes.drinking] : [],
      exercise: profile.attributes?.workout ? [profile.attributes.workout] : [],
      pets: profile.attributes?.pets ? [profile.attributes.pets] : [],
      smokingHabits: profile.attributes?.smoking ? [profile.attributes.smoking] : []
    },
    relationshipGoals: {
      title: profile.relationshipGoal?.title || "",
      subtitle: profile.relationshipGoal?.subtitle || ""
    },
    isDiscoverable: profile.isDiscoverable !== undefined ? profile.isDiscoverable : true,
    isMandatoryComplete: profile.isMandatoryComplete || false,
    isProfileComplete: profile.isProfileComplete || false,
    // kyc: profile.kyc || [
    //   { type: "selfie", status: "", reason: "" },
    //   { type: "doc", status: "", reason: "" }
    // ],
    languages: profile.attributes?.languages || [],
    location: profile.location || {
      type: "Point",
      coordinates: [0, 0],
      address: ""
    },
    preferences: {
      ageRange: {
        min: profile.preferences?.ageRange?.min ?? 18,
        max: profile.preferences?.ageRange?.max ?? 60
      },
      distanceRange: profile.preferences?.distanceRange ?? 50,
      genderPreference: profile.preferences?.genderPreference ?? []
    },

    verification: {
      status: profile.kyc?.status || "not_started",
      selfieUrl: profile.kyc?.selfie?.url || null,
      docUrl: profile.kyc?.idDocument?.frontUrl || null,
      rejectionReason: profile.kyc?.rejectionReason || null
    },
    settings: {
      notifications: {
        push: user.notificationSettings?.push ?? true,
        email: user.notificationSettings?.email ?? false,
        matches: user.notificationSettings?.matches ?? true,
        messages: user.notificationSettings?.messages ?? true
      }
    },

    moviePreference: profile.attributes?.movies || [],
    musicPreference: profile.attributes?.music || [],
    totalCompletion: profile.onboardingProgress?.totalCompletion || 0,
    photos: profile.photos || [{
      id: "",
      order: "",
      url: ""
    }],
    account_status: profile.account_status || {
      isBlocked: false,
      reason: ""
    },
    blockedUsers: (profile.blockedUsers || []).map(id => id.toString()),

    blockedContacts: blockedContacts.map(bc => bc.blockedPhoneHash),
    email: user.email || "",
    phone: user.phone || "",
    nickname: profile.nickname || "",
    dob: profile.dob
      ? profile.dob.toISOString().split("T")[0]
      : "",
    height: profile.height || "",
    jobtitle: profile.jobtitle || "",
    occupation: profile.occupation || "",
    about_me: profile.bio || profile.about_me || "",
    company: profile.company || "",
    school: profile.school || "",
    visibility: profile.visibility || "everyone",
    lastProfileUpdate: profile.lastProfileUpdate || profile.updatedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};