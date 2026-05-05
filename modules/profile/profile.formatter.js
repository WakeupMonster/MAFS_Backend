const {
  buildOnboardingResponse,
} = require("../../common/utils/onBoardingSteps");
// const UsageService = require("../subscription/services/usage.service");

const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// const planNames = {
//   free: "MAFS Free",
//   plus: "MAFS Plus",
//   gold: "MAFS Gold",
//   platinum: "MAFS Platinum",
//   monthly: "MAFS PREMIUM"
// };

// Simple completion logic based on mandatory fields
const calculateCompletion = (profile) => {
  return profile?.onboardingProgress?.totalCompletion || 0;
};

// eslint-disable-next-line no-unused-vars
const formatProfileResponse = async (
  user,
  profile,
  blockedContacts = [],
  blockedUser = [],
  subData = {},
  req
) => {
  if (!user) return null;
  const p = profile || {}; // Agar profile nahi hai toh empty object

  // 🔥 Fetch dynamic status from new UsageService (v3)
  // const usageStatus = await UsageService.getUsageStatus(user._id);
  // const v3Data = usageStatus.data;

  // const isPremium = v3Data.isPremium;
  // const allocations = v3Data.allocations;
  // const wallet = v3Data.wallet;
  // const premiumFeatures = v3Data.premiumFeatures;

  return {
    // 1. ACCOUNT (Data from User Model)
    account: {
      status: user.accountStatus || "active",
      banDetails: {
        isBanned: user.banDetails?.isBanned || false,
        reason: user.banDetails?.reason || null,
        bannedBy: user.banDetails?.bannedBy || null,
        bannedAt: user.banDetails?.bannedAt || null,
      },
      suspensionDetails: {
        isSuspended: user.suspensionDetails?.isSuspended || false,
        reason: user.suspensionDetails?.reason || null,
        suspendedAt: user.suspensionDetails?.suspendedAt || null,
        suspendUntil: user.suspensionDetails?.suspendUntil || null,
      },
      deactivationDetails: {
        isDeactivated: user.deactivationDetails?.isDeactivated || false,
        reason: user.deactivationDetails?.reason || null,
        deactivatedAt: user.deactivationDetails?.deactivatedAt || null,
      },
      deletionDetails: {
        isScheduledForDeletion:
          user.deletionDetails?.isScheduledForDeletion || false,
        reason: user.deletionDetails?.reason || null,
        scheduledAt: user.deletionDetails?.scheduledAt || null,
        deletionDate: user.deletionDetails?.deletionDate || null,
        daysRemaining: user.deletionDetails?.daysRemaining || null,
      },
    },
    profile: {
      id: profile?.userId || null,
      nickname: p.nickname || null,
      dob: profile?.dob ? profile.dob.toISOString().split("T")[0] : null,
      age: profile?.age || calculateAge(profile?.dob),
      gender: p?.gender || null,
      height: p?.height || null,
      about: p?.about || null,
      jobTitle: p?.jobTitle || null,
      livingIn: p?.livingIn || null,
      company: p?.company || null,
      school: p?.school || null,
      totalCompletion: calculateCompletion(profile),
      completionBreakdown: {
        photos: Math.round(p?.onboardingProgress?.photosScore || 0),
        basicInfo: Math.round(p?.onboardingProgress?.basicInfoScore || 0),
        careerAndEducation: Math.round(p?.onboardingProgress?.careerScore || 0),
        basics: Math.round(p?.onboardingProgress?.basicsScore || 0),
        lifestyle: Math.round(p?.onboardingProgress?.lifestyleScore || 0),
        preferences: Math.round(p?.onboardingProgress?.preferencesScore || 0),
        verification: Math.round(p?.onboardingProgress?.verificationScore || 0),
      },
    },

    // 4. ATTRIBUTES
    attributes: {
      zodiac: p.attributes?.zodiac || null,
      education: p.attributes?.education || null,
      familyPlans: p.attributes?.familyPlans || null,
      personalityType: p.attributes?.personalityType || null,
      communicationStyle: p.attributes?.communicationStyle || null,
      loveStyle: p.attributes?.loveStyle || null,
      pets: p.attributes?.pets || null,
      drinking: p.attributes?.drinking || null,
      smoking: p.attributes?.smoking || null,
      workout: p.attributes?.workout || null,
      dietary: p.attributes?.dietary || null,
      sleeping: p.attributes?.sleeping || null,
      socialMedia: p.attributes?.socialMedia || null,
      languages: p.attributes?.languages || [],
      interests: p.attributes?.interests || [],
      music: p.attributes?.music || [],
      movies: p.attributes?.movies || [],
      books: p.attributes?.books || [],
      travel: p.attributes?.travel || [],
      religion: p.attributes?.religion || null,
    },

    // 5. DISCOVERY
    discovery: {
      distanceRange: p.discovery?.distanceRange || 50,
      ageRange: {
        min: p.discovery?.ageRange?.min || 18,
        max: p.discovery?.ageRange?.max || 30,
      },
      showMeGender: p.discovery?.showMeGender || [],
      relationshipGoal: p.discovery?.relationshipGoal || null,
      globalVisibility: p.discovery?.globalVisibility || "everyone",
    },
    discoveryFilters: {
      interest: p.discovery?.preferredInterests || null,
      relationshipGoal: p.discovery?.filterRelationshipGoal || null,
      advancedFilters: {
        zodiac: p.discovery?.advancedFilters.zodiac || null,
        education: p.discovery?.advancedFilters.education || null,
        pets: p.discovery?.advancedFilters.pets || null,
        drinking: p.discovery?.advancedFilters.drinking || null,
        smoking: p.discovery?.advancedFilters.smoking || null,
        familyPlans: p.discovery?.advancedFilters.familyPlans || null,
        personalityType: p.discovery?.advancedFilters.personalityType || null,
        communicationStyle:
          p.discovery?.advancedFilters.communicationStyle || null,
        loveStyle: p.discovery?.advancedFilters.loveStyle || null,
        workout: p.discovery?.advancedFilters.workout || null,
        dietary: p.discovery?.advancedFilters.dietary || null,
        socialMedia: p.discovery?.advancedFilters.socialMedia || null,
        sleeping: p.discovery?.advancedFilters.sleeping || null,
      },
    },

    // 6. LOCATION
    location: {
      type: "Point",
      coordinates: p.location?.coordinates || [0, 0],
      city: p.location?.city || null,
      country: p.location?.country || null,
      full_address: p.location?.full_address || null,
    },

    // 7. PHOTOS
    photos: (p.photos || []).map((photo) => ({
      id: photo._id || photo.id || null,
      url: photo.url || null,
      publicId: photo.publicId || null,
      order: photo.order || 0,
    })),

    verification: {
      status: p.verification?.status || "pending",
      selfieUrl: p.verification?.selfieUrl || null,
      docUrl: p.verification?.docUrl || null,
      rejectionReason: p.verification?.rejectionReason || null,
    },

    // 8. VERIFICATION
    // subscription: {
    //   plan: {
    //     id: v3Data.plan || "free",
    //     name: v3Data.isPremium ? "MAFS Premium" : "MAFS Free",
    //     isActive: isPremium,
    //     expiryDate: v3Data.expiresAt || null,
    //     isAutoRenew: v3Data.autoRenew || false,
    //     source: "google_play"
    //   },
    //   wallet: {
    //     likes: {
    //       used: allocations.likes.used,
    //       limit: allocations.likes.limit,
    //       remaining: allocations.likes.remaining,
    //       isExhausted: allocations.likes.limit !== -1 && allocations.likes.used >= allocations.likes.limit
    //     },
    //     superLikes: {
    //       used: allocations.superKeens.used,
    //       limit: allocations.superKeens.limit,
    //       remaining: allocations.superKeens.remaining + wallet.superKeens,
    //       isExhausted: (allocations.superKeens.used >= allocations.superKeens.limit) && wallet.superKeens <= 0
    //     },
    //     rewinds: {
    //       remaining: allocations.rewinds.remaining,
    //       isUnlimited: allocations.rewinds.limit === -1
    //     }
    //   },
    //   benefits: {
    //     seeWhoLikesYou: premiumFeatures.seeWhoLikedYou,
    //     passportLocation: premiumFeatures.passport,
    //     turnOffAds: premiumFeatures.noAds,
    //     controlAgeDistance: isPremium
    //   }
    // },

    // 10. SETTINGS
    settings: {
      notifications: {
        push: user.notificationSettings?.push ?? true,
        email: user.notificationSettings?.email ?? false,
        matches: user.notificationSettings?.matches ?? true,
        messages: user.notificationSettings?.messages ?? true,
        likes: user.notificationSettings?.likes ?? true,
      },
      blockedContacts: blockedContacts.map((bc) => bc.blockedPhoneHash || bc),
      blockedUsers: blockedUser.map((bu) => bu.blockedId || bu),
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isPhoneVerified: user.isPhoneVerified || false,
    isEmailVerified: user.isEmailVerified || false,
    //  onboarding: buildOnboardingResponse(req)
    onboarding: await buildOnboardingResponse(req, user._id),
  };
};

module.exports = { formatProfileResponse };
