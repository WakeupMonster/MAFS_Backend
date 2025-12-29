// modules/profile/profile.formatter.js

// const {
//   calculateCompletion
// } = require("./profile.helpers");

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

function formatProfileResponse(profile, blockedContacts = []) {
  return {
    profile: {
      nickname: profile.nickname || "",
      dob: profile.dob
  ? profile.dob.toISOString().split("T")[0]
  : "",
      age: profile.age || calculateAge(profile.dob),
      gender: profile.gender || "",
      height: profile.height || null,
      about: profile.about || "",
      jobTitle: profile.jobTitle || "",
      company: profile.company || "",
      school: profile.school || "",
      totalCompletion: calculateCompletion(profile)
    },
    attributes: {
      zodiac: profile.attributes?.zodiac || "",
      education: profile.attributes?.education || "",
      familyPlans: profile.attributes?.familyPlans || "",
      personalityType: profile.attributes?.personalityType || "",
      communicationStyle: profile.attributes?.communicationStyle || "",
      loveStyle: profile.attributes?.loveStyle || "",
      pets: profile.attributes?.pets || "",
      drinking: profile.attributes?.drinking || "",
      smoking: profile.attributes?.smoking || "",
      workout: profile.attributes?.workout || "",
      dietary: profile.attributes?.dietary || "",
      sleeping: profile.attributes?.sleeping || "",
      socialMedia: profile.attributes?.socialMedia || "",
      languages: profile.attributes?.languages || [],
      interests: profile.attributes?.interests || [],
      music: profile.attributes?.music || [],
      movies: profile.attributes?.movies || [],
      books: profile.attributes?.books || [],
      travel: profile.attributes?.travel || [],
      religion: profile.attributes?.religion || ""
    },
    discovery: {
      distanceRange: profile.discovery?.distanceRange || 50,
      ageRange: {
        min: profile.discovery?.ageRange?.min || 18,
        max: profile.discovery?.ageRange?.max || 60
      },
      showMeGender: profile.discovery?.showMeGender || [],
      relationshipGoal: profile.discovery?.relationshipGoal || "",
      globalVisibility: profile.discovery?.globalVisibility || "everyone"
    },
         photos: profile.photos || [{
      id: "",
      order: "",
      url: ""
    }],
    location: {
      type: profile.location?.type || "Point",
      coordinates: profile.location?.coordinates || [0, 0],
      city: profile.location?.city || "",
      country: profile.location?.country || "",
      full_address: profile.location?.full_address || ""
    },

verification: {
  status: profile.verification?.status || profile.kyc?.status || "not_started",
  
  selfieUrl: profile.verification?.selfieUrl || profile.kyc?.selfie?.url || "",
  
  docUrl: profile.verification?.docUrl || profile.kyc?.idDocument?.frontUrl || "",
  
  rejectionReason: profile.verification?.rejectionReason || profile.kyc?.rejectionReason || ""
},
    subscription: profile.subscription || {
      planId: "free",
      isActive: false,
      superLikesCount: 0,
      boostsCount: 0,
      rewindsCount: 0
    },
    settings: {
      notifications: profile.settings?.notifications || {
        push: true, email: false, matches: true, messages: true
      }
    },
    blockedContacts: blockedContacts.map(bc => bc.blockedPhoneHash || bc),
    blockedUsers: (profile.settings?.blockedUsers || []).map(id => id.toString()),
    lastProfileUpdate: profile.lastProfileUpdate || profile.updatedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

module.exports = { formatProfileResponse };

// function formatProfileResponse(profile, user,blockedContacts = []) {
//   return {
//     // =========================
//     // PROFILE
//     // =========================
//     profile: {
//       nickname: profile.nickname ?? "",
//       dob: profile.dob ?? "",
//       age: calculateAge(profile.dob) ?? "",
//       gender: profile.gender ?? "",
//       height: profile.height ?? "",
//       about: profile.bio || profile.about_me || "",
//       jobTitle: profile.jobtitle || "",
//       company: profile.company ?? "",
//       school: profile.school ?? "",
//       totalCompletion: calculateCompletion(profile)
//     },

//     // =========================
//     // ATTRIBUTES (SAFE ACCESS)
//     // =========================
//     attributes: {
//       zodiac: profile.attributes?.zodiac ?? "",
//       education: profile.attributes?.education ?? "",
//       familyPlans: profile.attributes?.familyPlans ?? "",
//       personalityType: profile.attributes?.personalityType ?? "",
//       communicationStyle: profile.attributes?.communicationStyle ?? "",
//       loveStyle: profile.attributes?.loveStyle ?? "",

//       pets: profile.attributes?.pets ?? "",
//       drinking: profile.attributes?.drinking ?? "",
//       smoking: profile.attributes?.smoking ?? "",
//       workout: profile.attributes?.workout ?? "",
//       dietary: profile.attributes?.dietary ?? "",
//       sleeping: profile.attributes?.sleeping ?? "",
//       socialMedia: profile.attributes?.socialMedia ?? "",

//       languages: profile.attributes?.languages ?? [],
//       interests: profile.attributes?.interests ?? [],

//     //   music: profile.attributes?.music ?? [],
//     //   movies: profile.attributes?.movies ?? [],
//      moviePreference: profile.attributes?.movies || [],
//     musicPreference: profile.attributes?.music || [],
//       books: profile.attributes?.books ?? [],
//       travel: profile.attributes?.travel ?? [],
//       religion: profile.attributes?.religion ?? ""
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
// //   title: profile.discovery.relationshipGoal.title || "",
// //   subtitle: profile.discovery.relationshipGoal.subtitle || ""
// // },

//       globalVisibility: profile.discovery?.globalVisibility ?? "everyone"
//     },
//       photos: profile.photos || [{
//       id: "",
//       order: "",
//       url: ""
//     }],
//       location: profile.location || {
//       type: "Point",
//       coordinates: [0, 0],
//       address: ""
//     },
//      verification: {
//   status: profile.kyc?.status || "not_started",
//   selfieUrl: profile.kyc?.selfie?.url || "",
//   docUrl: profile.kyc?.idDocument?.frontUrl || "",
//   rejectionReason: profile.kyc?.rejectionReason || ""
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
