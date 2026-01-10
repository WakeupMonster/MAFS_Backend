// // // modules/profile/profile.formatter.js

// // const {
// //   calculateCompletion
// // } = require("./profile.helpers");

// const calculateAge = (dob) => {
//   if (!dob) return null;
//   const today = new Date();
//   const birthDate = new Date(dob);
//   let age = today.getFullYear() - birthDate.getFullYear();
//   const m = today.getMonth() - birthDate.getMonth();
//   if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
//   return age;
// };

// // Simple completion logic based on mandatory fields
// const calculateCompletion = (profile) => {
//   return profile.onboardingProgress?.totalCompletion || 0;
// };

// function formatProfileResponse(profile, blockedContacts = [],blockedUser=[]) {
//   return {
//     profile: {
//       nickname: profile.nickname || null,
//       dob: profile.dob
//   ? profile.dob.toISOString().split("T")[0]
//   : null,
//       age: profile.age || calculateAge(profile.dob),
//       gender: profile.gender || null,
//       height: profile.height || null,
//       about: profile.about || null,
//       jobTitle: profile.jobTitle || null,
//       company: profile.company || null,
//       school: profile.school || null,
//       totalCompletion: calculateCompletion(profile)
//     },
//     attributes: {
//       zodiac: profile.attributes?.zodiac || null,
//       education: profile.attributes?.education || null,
//       familyPlans: profile.attributes?.familyPlans || null,
//       personalityType: profile.attributes?.personalityType || null,
//       communicationStyle: profile.attributes?.communicationStyle || null,
//       loveStyle: profile.attributes?.loveStyle || null,
//       pets: profile.attributes?.pets || null,
//       drinking: profile.attributes?.drinking || null,
//       smoking: profile.attributes?.smoking || null,
//       workout: profile.attributes?.workout || null,
//       dietary: profile.attributes?.dietary || null,
//       sleeping: profile.attributes?.sleeping || null,
//       socialMedia: profile.attributes?.socialMedia || null,
//       languages: profile.attributes?.languages || [],
//       interests: profile.attributes?.interests || [],
//       music: profile.attributes?.music || [],
//       movies: profile.attributes?.movies || [],
//       books: profile.attributes?.books || [],
//       travel: profile.attributes?.travel || [],
//       religion: profile.attributes?.religion || null
//     },
//     discovery: {
//       distanceRange: profile.discovery?.distanceRange || 50,
//       ageRange: {
//         min: profile.discovery?.ageRange?.min || 18,
//         max: profile.discovery?.ageRange?.max || 60
//       },
//       showMeGender: profile.discovery?.showMeGender || [],
//       relationshipGoal: profile.discovery?.relationshipGoal || null,
//       globalVisibility: profile.discovery?.globalVisibility || "everyone",
//       // discoveryFilters : profile.discovery?.advancedFilters.smoking || []
//     },
//          photos: profile.photos || [{
//       id: null,
//       order: null,
//       url: null
//     }],
//     location: {
//       type: profile.location?.type || "Point",
//       coordinates: profile.location?.coordinates || [0, 0],
//       city: profile.location?.city || null,
//       country: profile.location?.country || null,
//       full_address: profile.location?.full_address || null
//     },

// verification: {
//   status: profile.verification?.status || profile.kyc?.status || "not_started",
  
//   selfieUrl: profile.verification?.selfieUrl || profile.kyc?.selfie?.url || null,
  
//   docUrl: profile.verification?.docUrl || profile.kyc?.idDocument?.frontUrl || null,
  
//   rejectionReason: profile.verification?.rejectionReason || profile.kyc?.rejectionReason || null
// },


//     subscription: profile.subscription || {
//       planId: "free",
//       isActive: false,
//       superLikesCount: 0,
//       boostsCount: 0,
//       rewindsCount: 0
//     },
//     settings: {
//       notifications: profile.settings?.notifications || {
//         push: true, email: false, matches: true, messages: true
//       },
//        blockedContacts: blockedContacts.map(bc => bc.blockedPhoneHash || bc),
//     blockedUsers: blockedUser.map(bu=>bu.blockedId || bu),
//     },
//     lastProfileUpdate: profile.lastProfileUpdate || profile.updatedAt,
//     createdAt: profile.createdAt,
//     updatedAt: profile.updatedAt
//   };
// }

// module.exports = { formatProfileResponse };



// const formatPublicProfile = (user, profile) => {
//   if (!profile) return null;

//   return {
//     // id: profile.userId,
//     name: profile.nickname || null,
//     displayName: `${profile.nickname || "User"}, ${calculateAge(profile.dob)}`,
//     // age: profile.age || 0,
//     age: profile.age || calculateAge(profile.dob),
//     gender: {
//       display: profile.gender || null,
//       pronouns: profile.pronouns || "she/her/hers" // Figma screen par pronouns hain
//     },
//     bio: profile.about || null,
//     physical: {
//       height: profile.height ? `${profile.height} cm` : null,
//       weight: profile.weight ? `${profile.weight} kg` : null
//     },
//     work: {
//       title: profile.jobTitle || null,
//       company: profile.company || null
//     },
//     education: {
//       school: profile.school || null
//     },
//     location: {
//       city: profile.location?.city || null,
//       distance: "5 kilometer away" // Ye dynamic calculation se aayega
//     },
//     photos: profile.photos || [],
    
//     // Figma: Basics Section
//     basics: {
//       zodiac: profile.attributes?.zodiac || null,
//       education: profile.attributes?.education || null,
//       familyPlans: profile.attributes?.familyPlans || null,
//       vaccination: profile.attributes?.vaccination || null,
//       personalityType: profile.attributes?.personalityType || null,
//       communicationStyle: profile.attributes?.communicationStyle || null,
//       loveStyle: profile.attributes?.loveStyle || null,
//       bloodGroup: profile.attributes?.bloodGroup || null
//     },

//     // Figma: Lifestyle Section
//     lifestyle: {
//       pets: profile.attributes?.pets || null,
//       drinking: profile.attributes?.drinking || null,
//       smoking: profile.attributes?.smoking || null,
//       workout: profile.attributes?.workout || null,
//       dietary: profile.attributes?.dietary || null,
//       socialMedia: profile.attributes?.socialMedia || null,
//       sleeping: profile.attributes?.sleeping || null
//     },

//     // Figma: Detailed Preferences
//     interests: profile.attributes?.interests || [],
//     languages: profile.attributes?.languages || [],
//     relationshipGoals: profile.discovery?.relationshipGoal || null,
//     religion: profile.attributes?.religion || null,

//     preferences: {
//       music: profile.attributes?.music || [],
//       movies: profile.attributes?.movies || [],
//       books: profile.attributes?.books || [],
//       travel: profile.attributes?.travel || []
//     }
//   };
// };

// module.exports = { formatPublicProfile };



// function formatProfileResponse(profile, user,blockedContacts = []) {
//   return {
//     // =========================
//     // PROFILE
//     // =========================
//     profile: {
//       nickname: profile.nickname ?? null,
//       dob: profile.dob ?? null,
//       age: calculateAge(profile.dob) ?? null,
//       gender: profile.gender ?? null,
//       height: profile.height ?? null,
//       about: profile.bio || profile.about_me || null,
//       jobTitle: profile.jobtitle || null,
//       company: profile.company ?? null,
//       school: profile.school ?? null,
//       totalCompletion: calculateCompletion(profile)
//     },

//     // =========================
//     // ATTRIBUTES (SAFE ACCESS)
//     // =========================
//     attributes: {
//       zodiac: profile.attributes?.zodiac ?? null,
//       education: profile.attributes?.education ?? null,
//       familyPlans: profile.attributes?.familyPlans ?? null,
//       personalityType: profile.attributes?.personalityType ?? null,
//       communicationStyle: profile.attributes?.communicationStyle ?? null,
//       loveStyle: profile.attributes?.loveStyle ?? null,

//       pets: profile.attributes?.pets ?? null,
//       drinking: profile.attributes?.drinking ?? null,
//       smoking: profile.attributes?.smoking ?? null,
//       workout: profile.attributes?.workout ?? null,
//       dietary: profile.attributes?.dietary ?? null,
//       sleeping: profile.attributes?.sleeping ?? null,
//       socialMedia: profile.attributes?.socialMedia ?? null,

//       languages: profile.attributes?.languages ?? [],
//       interests: profile.attributes?.interests ?? [],

//     //   music: profile.attributes?.music ?? [],
//     //   movies: profile.attributes?.movies ?? [],
//      moviePreference: profile.attributes?.movies || [],
//     musicPreference: profile.attributes?.music || [],
//       books: profile.attributes?.books ?? [],
//       travel: profile.attributes?.travel ?? [],
//       religion: profile.attributes?.religion ?? null
//     },
    
//     discovery: {
//       distanceRange: profile.discovery?.distanceRange ?? 50,

//       ageRange: {
//         min: profile.discovery?.ageRange?.min ?? 18,
//         max: profile.discovery?.ageRange?.max ?? 60
//       },

//       showMeGender: profile.discovery?.showMeGender ?? [],
//     //    showMeGender:   profile.preferences?.genderPreference ?? [],

//     //   relationshipGoal: profile.discovery?.relationshipGoal ?? null,
// //      relationshipGoals: {
// //   title: profile.discovery.relationshipGoal.title || null,
// //   subtitle: profile.discovery.relationshipGoal.subtitle || null
// // },

//       globalVisibility: profile.discovery?.globalVisibility ?? "everyone"
//     },
//       photos: profile.photos || [{
//       id: null,
//       order: null,
//       url: null
//     }],
//       location: profile.location || {
//       type: "Point",
//       coordinates: [0, 0],
//       address: null
//     },
//      verification: {
//   status: profile.kyc?.status || "not_started",
//   selfieUrl: profile.kyc?.selfie?.url || null,
//   docUrl: profile.kyc?.idDocument?.frontUrl || null,
//   rejectionReason: profile.kyc?.rejectionReason || null
// },
// settings: {
//   notifications: {
//     push: user.notificationSettings?.push ?? true,
//     email: user.notificationSettings?.email ?? false,
//     matches: user.notificationSettings?.matches ?? true,
//     messages: user.notificationSettings?.messages ?? true
//   }
// },

//     // =========================
//     // BLOCKED CONTACTS
//     // =========================
//     blockedContacts: blockedContacts.map(bc => bc.blockedPhoneHash),
//      blockedUsers: (profile.blockedUsers || []).map(id => id.toString()),
//      lastProfileUpdate: profile.lastProfileUpdate || profile.updatedAt,
//     createdAt: profile.createdAt,
//     updatedAt: profile.updatedAt,
//   };
// }

// module.exports = {
//   formatProfileResponse
// };



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


const formatProfileResponse = (user, profile,blockedContacts = [], blockedUser = [],subData = {}) => {
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
    onboarding: {
      isComplete: user.onboardingComplete || false,
      nextstep: user.nextStep || 1,
      currentScreenSlug: user.currentScreenSlug || "welcome_screen"
    },

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

    // 9. SUBSCRIPTION
    // subscription: {
    //   planId: user.subscription?.planId || "free",
    //   isActive: user.subscription?.isActive || false,
    //   expiryDate: user.subscription?.expiryDate || null,
    //   isTrial: user.subscription?.isTrial || false,
    //   superLikesCount: user.subscription?.superLikesCount || 0,
    //   boostsCount: user.subscription?.boostsCount || 0,
    //   rewindsCount: user.subscription?.rewindsCount || 0
    // },
    // subscription: {
    //   planId: sub.planId || "free",
    //   isActive: sub.isActive || false,
    //   expiryDate: sub.expiryDate || null,
    //   isTrial: sub.isTrial || false,

    //   // --- Frontend ke liye detailed daily stats ---
    //   dailyStats: {
    //     likes: {
    //       used: sub.dailyLikesUsed || 0,
    //       limit: MAX_LIKES,
    //       remaining: Math.max(0, MAX_LIKES - (sub.dailyLikesUsed || 0)),
    //       isExhausted: (sub.dailyLikesUsed || 0) >= MAX_LIKES
    //     },
    //     superLikes: {
    //       used: sub.dailySuperlikesUsed || 0,
    //       limit: MAX_SUPERLIKES,
    //       remaining: Math.max(0, MAX_SUPERLIKES - (sub.dailySuperlikesUsed || 0)),
    //       isExhausted: (sub.dailySuperlikesUsed || 0) >= MAX_SUPERLIKES && (sub.superlikeBalance || 0) <= 0
    //     },
    //     rewinds: {
    //       used: sub.dailyRewindsUsed || 0,
    //       limit: sub.planId !== 'free' ? 999 : 0, // Premium users ko unlimited
    //       remaining: sub.planId !== 'free' ? 999 : 0,
    //       isExhausted: sub.planId === 'free'
    //     }
    //   },

    //   // --- Extra Balance jo user ne khareeda ho ---
    //   inventoryBalance: {
    //     superLikes: sub.superlikeBalance || 0,
    //     boosts: sub.boostsCount || 0,
    //     rewinds: sub.rewindsCount || 0
    //   },

    //   // --- UI Helpers ---
    //   meta: {
    //     resetAt: new Date(new Date().setHours(24, 0, 0, 0)), // Aaj ki midnight
    //     showPaywall: (sub.dailyLikesUsed || 0) >= MAX_LIKES,
    //     upsellMessage: sub.planId === 'free' ? "Upgrade to Gold for unlimited likes!" : null
    //   }
    // },

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
    isEmailVerified: user.isEmailVerified || false
  };
};

module.exports = { formatProfileResponse };