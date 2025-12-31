/**
 * Profile Formatter: Ye function ensure karta hai ki frontend ko 
 * hamesha ek fixed structure mile aur NULL ki jagah empty values milen.
 */


const calculateAge = (dob) => {
  if (!dob) return "";
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// Simple completion logic based on mandatory fields
const calculateCompletion = (profile) => {
  return profile.onboardingProgress?.totalCompletion || 0;
};
const formatUserProfile = (user, profile,blockedContacts = [], blockedUser = []) => {
  if (!user) return null;
  const p = profile || {}; // Agar profile nahi hai toh empty object

  return {
    // 1. ACCOUNT (Data from User Model)
    account: {
      status: user.accountStatus || "active",
      banDetails: {
        isBanned: user.banDetails?.isBanned || false,
        reason: user.banDetails?.reason || "",
        bannedBy: user.banDetails?.bannedBy || "",
        bannedAt: user.banDetails?.bannedAt || ""
      },
      deactivationDetails: {
        isDeactivated: user.deactivationDetails?.isDeactivated || false,
        reason: user.deactivationDetails?.reason || "",
        deactivatedAt: user.deactivationDetails?.deactivatedAt || ""
      },
      deletionDetails: {
        isScheduledForDeletion: user.deletionDetails?.isScheduledForDeletion || false,
        scheduledAt: user.deletionDetails?.scheduledAt || ""
      }
    },

    // 2. ONBOARDING
    onboarding: {
      isComplete: user.onboardingComplete || false,
      nextstep: user.nextStep || 1,
      currentScreenSlug: user.currentScreenSlug || "welcome_screen"
    },

    // 3. PUBLIC PROFILE (Data from Profile Model)
    profile: {
      nickname: p.nickname || "",
      dob: profile.dob
  ? profile.dob.toISOString().split("T")[0]
  : "",
      age: profile.age || calculateAge(profile.dob),
      gender: p.gender || "",
      height: p.height || "",
      about: p.about || "",
      jobTitle: p.jobTitle || "",
      company: p.company || "",
      school: p.school || "",
      totalCompletion: calculateCompletion(profile)
    //   totalCompletion: p.totalCompletion || 0
    },

    // 4. ATTRIBUTES
    attributes: {
      zodiac: p.attributes?.zodiac || "",
      education: p.attributes?.education || "",
      familyPlans: p.attributes?.familyPlans || "",
      personalityType: p.attributes?.personalityType || "",
      communicationStyle: p.attributes?.communicationStyle || "",
      loveStyle: p.attributes?.loveStyle || "",
      pets: p.attributes?.pets || "",
      drinking: p.attributes?.drinking || "",
      smoking: p.attributes?.smoking || "",
      workout: p.attributes?.workout || "",
      dietary: p.attributes?.dietary || "",
      sleeping: p.attributes?.sleeping || "",
      socialMedia: p.attributes?.socialMedia || "",
      languages: p.attributes?.languages || [],
      interests: p.attributes?.interests || [],
      music: p.attributes?.music || [],
      movies: p.attributes?.movies || [],
      books: p.attributes?.books || [],
      travel: p.attributes?.travel || [],
      religion: p.attributes?.religion || ""
    },

    // 5. DISCOVERY
    discovery: {
      distanceRange: p.discovery?.distanceRange || 50,
      ageRange: {
        min: p.discovery?.ageRange?.min || 18,
        max: p.discovery?.ageRange?.max || 30
      },
      showMeGender: p.discovery?.showMeGender || [],
      relationshipGoal: p.discovery?.relationshipGoal || "",
      globalVisibility: p.discovery?.globalVisibility || "everyone"
    },

    // 6. LOCATION
    location: {
      type: "Point",
      coordinates: p.location?.coordinates || [0, 0],
      city: p.location?.city || "",
      country: p.location?.country || "",
      full_address: p.location?.full_address || ""
    },

    // 7. PHOTOS
    photos: (p.photos || []).map(photo => ({
      id: photo._id || photo.id || "",
      url: photo.url || "",
      order: photo.order || 0
    })),

    // 8. VERIFICATION
    verification: {
      status: p.verification?.status || "pending",
      selfieUrl: p.verification?.selfieUrl || "",
      docUrl: p.verification?.docUrl || "",
      rejectionReason: p.verification?.rejectionReason || ""
    },

    // 9. SUBSCRIPTION
    subscription: {
      planId: user.subscription?.planId || "free",
      isActive: user.subscription?.isActive || false,
      expiryDate: user.subscription?.expiryDate || "",
      isTrial: user.subscription?.isTrial || false,
      superLikesCount: user.subscription?.superLikesCount || 0,
      boostsCount: user.subscription?.boostsCount || 0,
      rewindsCount: user.subscription?.rewindsCount || 0
    },

    // 10. SETTINGS
    settings: {
      notifications: {
        push: p.settings?.notifications?.push ?? true,
        email: p.settings?.notifications?.email ?? false,
        matches: p.settings?.notifications?.matches ?? true,
        messages: p.settings?.notifications?.messages ?? true
      },
     
    },
    blockedContacts: blockedContacts.map(bc => bc.blockedPhoneHash || bc),
    blockedUsers: blockedUser.map(bu=>bu.blockedId || bu),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isPhoneVerified: user.isPhoneVerified || false,
    isEmailVerified: user.isEmailVerified || false
  };
};

module.exports = { formatUserProfile };