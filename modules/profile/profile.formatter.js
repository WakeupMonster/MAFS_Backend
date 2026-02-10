const { buildOnboardingResponse } = require("../../common/utils/onBoardingSteps");

const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const planNames = {
    free: "MAFS Free",
    plus: "MAFS Plus",
    gold: "MAFS Gold",
    platinum: "MAFS Platinum"
  };


// Simple completion logic based on mandatory fields
const calculateCompletion = (profile) => {
  return profile.onboardingProgress?.totalCompletion || 0;
};


const formatProfileResponse = async (user, profile,blockedContacts = [], blockedUser = [],subData = {},req) => {
  if (!user) return null;
  const p = profile || {}; // Agar profile nahi hai toh empty object
const sub = subData || {}; // Hum subData (UserSubscription document) pass karenge

  // Daily Limits define (Inhe aap helper se bhi la sakte hain)
  const MAX_LIKES = 30;
  const MAX_SUPERLIKES = 3;
  
  const isPremium = ['plus', 'gold', 'platinum'].includes(sub.planId);
const tonight = new Date();
tonight.setHours(24, 0, 0, 0);
  return {
    // 1. ACCOUNT (Data from User Model)
    account: {
      status: user.accountStatus || "active",
      banDetails: {
        isBanned: user.banDetails?.isBanned || false,
        reason: user.banDetails?.reason || null,
        bannedBy: user.banDetails?.bannedBy || null,
        bannedAt: user.banDetails?.bannedAt || null
      },
      deactivationDetails: {
        isDeactivated: user.deactivationDetails?.isDeactivated || false,
        reason: user.deactivationDetails?.reason || null,
        deactivatedAt: user.deactivationDetails?.deactivatedAt || null
      },
      deletionDetails: {
        isScheduledForDeletion: user.deletionDetails?.isScheduledForDeletion || false,
        scheduledAt: user.deletionDetails?.scheduledAt || null
      }
    },

    // 2. ONBOARDING
    // onboarding: {
    //   isComplete: user.onboardingComplete || false,
    //   nextstep: user.nextStep || 1,
    //   currentScreenSlug: user.currentScreenSlug || "welcome_screen"
    // },

    // 3. PUBLIC PROFILE (Data from Profile Model)
    profile: {
    id: profile.userId,
      nickname: p.nickname || null,
      dob: profile.dob
  ? profile.dob.toISOString().split("T")[0]
  : null,
      age: profile.age || calculateAge(profile.dob),
      gender: p.gender || null,
      height: p.height || null,
      about: p.about || null,
      jobTitle: p.jobTitle || null,
      company: p.company || null,
      school: p.school || null,
      totalCompletion: calculateCompletion(profile)
    //   totalCompletion: p.totalCompletion || 0
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
      religion: p.attributes?.religion || null
    },

    // 5. DISCOVERY
    discovery: {
      distanceRange: p.discovery?.distanceRange || 50,
      ageRange: {
        min: p.discovery?.ageRange?.min || 18,
        max: p.discovery?.ageRange?.max || 30
      },
      showMeGender: p.discovery?.showMeGender || [],
      relationshipGoal: p.discovery?.relationshipGoal || null,
      globalVisibility: p.discovery?.globalVisibility || "everyone"
    },
    discoveryFilters : {
      interest : p.discovery?.preferredInterests || null,
      relationshipGoal : p.discovery?.filterRelationshipGoal || null,
      advancedFilters : {
        zodiac :  p.discovery?.advancedFilters.zodiac || null,
        education :  p.discovery?.advancedFilters.education || null,
        pets :  p.discovery?.advancedFilters.pets || null,
        drinking :  p.discovery?.advancedFilters.drinking || null,
        smoking :  p.discovery?.advancedFilters.smoking || null
      },
    // distanceRange: p.discovery?.distanceRange || 50,
    //   ageRange: {
    //     min: p.discovery?.ageRange?.min || 18,
    //     max: p.discovery?.ageRange?.max || 30
    //   },
    },

    // 6. LOCATION
    location: {
      type: "Point",
      coordinates: p.location?.coordinates || [0, 0],
      city: p.location?.city || null,
      country: p.location?.country || null,
      full_address: p.location?.full_address || null
    },

    // 7. PHOTOS
    photos: (p.photos || []).map(photo => ({
      id: photo._id || photo.id || null,
      url: photo.url || null,
      publicId : photo.publicId || null,
      order: photo.order || 0
    })),

    // 8. VERIFICATION
    verification: {
      status: p.verification?.status || "pending",
      selfieUrl: p.verification?.selfieUrl || null,
      docUrl: p.verification?.docUrl || null,
      rejectionReason: p.verification?.rejectionReason || null
    },
    subscription: {
      plan: {
        id: sub.planId || "free",
        name: planNames[sub.planId] || "MAFS Free",
        isActive: sub.isActive || false,
        expiryDate: sub.expiryDate || null,
        isAutoRenew: sub.isAutoRenew || false,
        source: sub.paymentSource || "google_play"
      },
      wallet: {
            likes: {
          used: sub.dailyLikesUsed || 0,
          limit: MAX_LIKES,
          remaining: Math.max(0, MAX_LIKES - (sub.dailyLikesUsed || 0)),
          isExhausted: (sub.dailyLikesUsed || 0) >= MAX_LIKES
        },
        superLikes: {
          used: sub.dailySuperlikesUsed || 0,
          limit: MAX_SUPERLIKES,
          remaining: Math.max(0, MAX_SUPERLIKES - (sub.dailySuperlikesUsed || 0)),
          isExhausted: (sub.dailySuperlikesUsed || 0) >= MAX_SUPERLIKES && (sub.superlikeBalance || 0) <= 0
        },
        rewinds: {
          remaining: isPremium ? 9999 : 0,
          isUnlimited: isPremium
        }
        // rewinds: {
        //   used: sub.dailyRewindsUsed || 0,
        //   limit: sub.planId !== 'free' ? 999 : 0, // Premium users ko unlimited
        //   remaining: sub.planId !== 'free' ? 999 : 0,
        //   isExhausted: sub.planId === 'free'
        // }
        // boosts: {
        //   remaining: sub.boostsCount || 0,
        //   resetAt: null
        // },
      
      },
      benefits: {
        seeWhoLikesYou: ['gold', 'platinum'].includes(sub.planId),
        passportLocation: isPremium,
        turnOffAds: isPremium,
        controlAgeDistance: isPremium
      }
    },

    // 10. SETTINGS
    settings: {
      notifications: {
        push: p.settings?.notifications?.push ?? true,
        email: p.settings?.notifications?.email ?? false,
        matches: p.settings?.notifications?.matches ?? true,
        messages: p.settings?.notifications?.messages ?? true
      },
     blockedContacts: blockedContacts.map(bc => bc.blockedPhoneHash || bc),
    blockedUsers: blockedUser.map(bu=>bu.blockedId || bu),
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isPhoneVerified: user.isPhoneVerified || false,
    isEmailVerified: user.isEmailVerified || false,
    //  onboarding: buildOnboardingResponse(req)
    onboarding: await buildOnboardingResponse(req, user._id)

  };
};

module.exports = { formatProfileResponse };