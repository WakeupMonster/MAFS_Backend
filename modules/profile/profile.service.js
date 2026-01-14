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


// module.exports.formatProfileResponse = (profile, user = {}) => {
//   return {
//     _id: profile._id,
//     userId: profile.userId,
//     __v: profile.__v || 0,

//     bookPreference: profile.bookPreference || [],
//     canAccessSwipe: profile.canAccessSwipe ?? false,

//     // 🔹 Flatten discoveryFilters
//     basics: profile.basics || {
//       PersonalityType: profile.basics.PersonalityType || [],
//       communicationStyle: [],
//       education: [],
//       familyPlans: [],
//       loveStyle: [],
//       zodiac: []
//     },

//     interests: profile.interests || [],

//     lifestyle: profile.discoveryFilters?.lifestyle || {
//       drinking: [],
//       exercise: [],
//       pets: [],
//       smokingHabits: []
//     },

//     relationshipGoal: {
//   key: profile.relationshipGoal?.key || "",
//   title: profile.relationshipGoal?.title || "",
//   subtitle: profile.relationshipGoal?.subtitle || ""
// },

//     isDiscoverable: profile.isDiscoverable ?? false,
//     isMandatoryComplete: profile.isMandatoryComplete ?? false,
//     isProfileComplete: profile.isProfileComplete ?? false,

//     // 🔹 KYC normalize
//     // kyc: [
//     //   {
//     //     type: "selfie",
//     //     status: profile.kyc?.status || "",
//     //     reason: ""
//     //   },
//     //   {
//     //     type: "doc",
//     //     status: profile.kyc?.status || "",
//     //     reason: ""
//     //   }
//     // ],


//     kyc: [
//   {
//     type: "selfie",
//     status: profile.kyc?.selfie?.url
//       ? profile.kyc.status
//       : "not_started",
//     reason: profile.kyc?.rejectionReason || ""
//   },
//   {
//     type: "doc",
//     status: profile.kyc?.idDocument?.frontUrl
//       ? profile.kyc.status
//       : "not_started",
//     reason: profile.kyc?.rejectionReason || ""
//   }
// ],

//     languages: profile.languages || [],

//     // location: {
//     //   coordinates: profile.location?.coordinates || [0, 0],
//     //   address: profile.location?.address || "",
//     //   type: "Point"
//     // },

//     location: {
//   coordinates: profile.location?.coordinates || [0, 0],
//   address: [
//     profile.location?.city,
//     profile.location?.state,
//     profile.location?.country
//   ].filter(Boolean).join(", "),
//   type: "Point"
// },

//     moviePreference: profile.moviePreference || [],
//     musicPreference: profile.musicPreference || [],

//     totalCompletion: profile.onboardingProgress?.totalCompletion || 0,

//     photos:
//       profile.photos?.length
//         ? profile.photos
//         : [{ id: "", order: "", url: "" }],

//     account_status: {
//       isBlocked: false,
//       reason: ""
//     },

//     email: user.email || "",
//     phone_no: user.phone || "",

//     nickname: profile.nickname || "",
//     height: profile.height || "",
//     jobtitle: profile.jobtitle || "",
//     occupation: profile.occupation || "",
//     about_me: profile.about_me || "",
//     company: profile.company || "",
//     school: profile.school || "",

//     visibility: profile.visibility || "everyone",
//     createdAt: profile.createdAt,
//     updatedAt: profile.updatedAt,
//     lastProfileUpdate: profile.updatedAt
//   };
// };




// exports.formatProfileResponse = (profile) => {
//   // Ensure all nested objects exist
//   profile.basics = profile.basics || {};
//   profile.attributes = profile.attributes || {};
//   profile.discovery = profile.discovery || {};
//   profile.basics.education = profile.basics.education || {};
//   profile.discovery.ageRange = profile.discovery.ageRange || {};

//   // Format the response
//   return {
//     _id: profile._id,
//     userId: profile.userId,
//     // Basic Info
//     nickname: profile.nickname,
//     fullName: profile.fullName,
//     bio: profile.bio,
//     dob: profile.dob,
//     age: profile.age,
//     gender: profile.gender,
//     height: profile.height,
//     jobTitle: profile.jobTitle || profile.jobtitle, // Handle both old and new field names
//     company: profile.company,
//     school: profile.school,
    
//     // Basics
//     basics: {
//       education: {
//         level: profile.basics.education?.level,
//         institution: profile.basics.education?.institution
//       },
//       zodiac: profile.basics.zodiac,
//       familyPlans: profile.basics.familyPlans,
//       PersonalityType: profile.basics.PersonalityType, // This was causing the error
//       communicationStyle: profile.basics.communicationStyle,
//       loveStyle: profile.basics.loveStyle
//     },
    
//     // Attributes
//     attributes: {
//       // Basic info
//       zodiac: profile.attributes.zodiac || profile.basics.zodiac,
//       education: profile.attributes.education || profile.basics.education?.level,
//       familyPlans: profile.attributes.familyPlans || profile.basics.familyPlans,
//       personalityType: profile.attributes.personalityType || profile.basics.PersonalityType,
//       communicationStyle: profile.attributes.communicationStyle || profile.basics.communicationStyle,
//       loveStyle: profile.attributes.loveStyle || profile.basics.loveStyle,
      
//       // Lifestyle
//       pets: profile.attributes.pets,
//       drinking: profile.attributes.drinking,
//       smoking: profile.attributes.smoking,
//       workout: profile.attributes.workout,
//       dietary: profile.attributes.dietary,
//       sleeping: profile.attributes.sleeping,
//       socialMedia: profile.attributes.socialMedia,
//       religion: profile.attributes.religion,
      
//       // Arrays
//       languages: profile.attributes.languages || [],
//       interests: profile.attributes.interests || [],
//       music: profile.attributes.music || [],
//       movies: profile.attributes.movies || [],
//       books: profile.attributes.books || [],
//       travel: profile.attributes.travel || []
//     },
    
//     // Discovery
//     discovery: {
//       distanceRange: profile.discovery.distanceRange || 50,
//       ageRange: {
//         min: profile.discovery.ageRange?.min || 18,
//         max: profile.discovery.ageRange?.max || 99
//       },
//       showMeGender: profile.discovery.showMeGender || [],
//       relationshipGoal: profile.discovery.relationshipGoal,
//       globalVisibility: profile.discovery.globalVisibility || 'everyone'
//     },
    
//     // Other existing fields
//     photos: profile.photos || [],
//     isProfileCompleted: profile.isProfileCompleted || false,
//     isOnboardingCompleted: profile.isOnboardingCompleted || false,
//     isKycVerified: profile.isKycVerified || false,
//     isDiscoverable: profile.isDiscoverable !== undefined ? profile.isDiscoverable : true,
//     createdAt: profile.createdAt,
//     updatedAt: profile.updatedAt
//   };
// };













// exports.formatProfileResponse = (profile) => {
//   // Initialize all required objects
//   profile.basics = profile.basics || {
//     PersonalityType: [],
//     communicationStyle: [],
//     education: [],
//     familyPlans: [],
//     loveStyle: [],
//     zodiac: []
//   };
  
//   profile.lifestyle = profile.lifestyle || {
//     drinking: [],
//     exercise: [],
//     pets: [],
//     smokingHabits: []
//   };
  
//   profile.relationshipGoals = profile.relationshipGoals || {
//     title: "",
//     subtitle: ""
//   };
  
//   profile.kyc = profile.kyc || [
//     { type: "selfie", status: "", reason: "" },
//     { type: "doc", status: "", reason: "" }
//   ];
  
//   profile.location = profile.location || {
//     type: "Point",
//     coordinates: [0, 0],
//     address: ""
//   };
  
//   profile.photos = profile.photos || [{
//     id: "",
//     order: "",
//     url: ""
//   }];
  
//   profile.account_status = profile.account_status || {
//     isBlocked: false,
//     reason: ""
//   };

//   // Format the response
//   const response = {
//     success: true,
//     data: {
//       _id: profile._id,
//       userId: profile.userId,
//       __v: profile.__v || 0,
//       bookPreference: profile.bookPreference || [],
//       canAccessSwipe: profile.canAccessSwipe || false,
//       basics: {
//         PersonalityType: profile.basics.PersonalityType || [],
//         communicationStyle: profile.basics.communicationStyle || [],
//         education: profile.basics.education || [],
//         familyPlans: profile.basics.familyPlans || [],
//         loveStyle: profile.basics.loveStyle || [],
//         zodiac: profile.basics.zodiac || []
//       },
//       interests: profile.interests || [],
//       lifestyle: {
//         drinking: profile.lifestyle.drinking || [],
//         exercise: profile.lifestyle.exercise || [],
//         pets: profile.lifestyle.pets || [],
//         smokingHabits: profile.lifestyle.smokingHabits || []
//       },
//       relationshipGoals: {
//         title: profile.relationshipGoals.title || "",
//         subtitle: profile.relationshipGoals.subtitle || ""
//       },
//       isDiscoverable: profile.isDiscoverable !== undefined ? profile.isDiscoverable : false,
//       isMandatoryComplete: profile.isMandatoryComplete || false,
//       isProfileComplete: profile.isProfileComplete || false,
//       kyc: profile.kyc,
//       languages: profile.languages || [],
//       location: profile.location,
//       moviePreference: profile.moviePreference || [],
//       musicPreference: profile.musicPreference || [],
//       totalCompletion: profile.totalCompletion || 0,
//       photos: profile.photos,
//       account_status: profile.account_status,
//       email: profile.email || "",
//       phone_no: profile.phone_no || "",
//       createdAt: profile.createdAt,
//       updatedAt: profile.updatedAt,
//       visibility: profile.visibility || "everyone",
//       lastProfileUpdate: profile.lastProfileUpdate || profile.updatedAt,
//       nickname: profile.nickname || "",
//       height: profile.height || "",
//       jobtitle: profile.jobtitle || profile.jobTitle || "",
//       occiupation: profile.occiupation || "",
//       about_me: profile.about_me || profile.bio || "",
//       company: profile.company || "",
//       school: profile.school || ""
//     }
//   };

//   return response;
// };



exports.formatProfileResponse = (profile,user = {},blockedContacts = []) => {
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
   phone : user.phone || "",
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