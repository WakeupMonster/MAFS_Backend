// // // // src/modules/profile/profile.model.js
// // // const mongoose = require('mongoose');
// // // const ProfileSchema = new mongoose.Schema({

// // //   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth', required: true },

// // //   nickname: String,
// // //   fullName: String,
// // //   bio: { type: String, maxlength: 300 },

// // //   dob: Date,
// // //   gender: String,
// // //   interestedIn: [String],

// // //   preferences: {
// // //     ageRange: {
// // //       min: Number,
// // //       max: Number
// // //     },
// // //     distanceRange: Number,
// // //     genderPreference: [String]
// // //   },

// // //   interests: [String],

// // //   photos: [{
// // //     url: String,
// // //     isPrimary: Boolean,
// // //     order: Number
// // //   }],

// // //   location: {
// // //     type: {
// // //       type: String,
// // //       enum: ['Point'],
// // //       default: 'Point'
// // //     },
// // //     coordinates: {
// // //       type: [Number], // [long, lat]
// // //       default: [0, 0]
// // //     }
// // //   },

// // //   isProfileCompleted: { type: Boolean, default: false },
// // //   isOnboardingCompleted: { type: Boolean, default: false },
// // //   isKycVerified: { type: Boolean, default: false },
// // //   isDiscoverable: { type: Boolean, default: true },

// // //   profileCompletedAt: Date,
// // //   onboardingStartedAt: Date,
// // //   onboardingCompletedAt: Date

// // // }, { timestamps: true });

// // // ProfileSchema.index({ location: '2dsphere' });

// // // src/modules/profile/profile.model.js
// // const mongoose = require('mongoose');

// // const PhotoSchema = new mongoose.Schema({
// //   url: { type: String, required: true },
// //   isPrimary: { type: Boolean, default: false },
// //   order: { type: Number, default: 0 },
// //   uploadedAt: { type: Date, default: Date.now }
// // }, { _id: false });

// // const ProfileSchema = new mongoose.Schema({
// //   userId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: 'User',
// //     required: true,
// //     index: true
// //   },

// //   nickname: { type: String },
// //   fullName: { type: String },
// //   bio: { type: String, maxlength: 300 },

// //   dob: { type: Date },
// //   gender: { type: String, enum: ["male", "female", "other","trans"] },

// //   // INTERESTS
// //   interests: [{ type: String }],
// //   relationshipGoal : [{ type: String }],
// //   // PREFERENCES
// //   preferences: {
// //     ageRange: {
// //       min: { type: Number, default: 18 },
// //       max: { type: Number, default: 60 }
// //     },
// //     distanceRange: { type: Number, default: 50 }, // kilometers
// //     genderPreference: [{ type: String }]
// //   },

// //   photos: [PhotoSchema],

// //   location: {
// //     type: {
// //       type: String,
// //       enum: ['Point'],
// //       default: 'Point'
// //     },
// //     coordinates: {
// //       type: [Number], // [lon, lat]
// //       default: [0, 0]
// //     },
// //     city: { type: String },
// //     country: { type: String }
// //   },

// //   isProfileCompleted: { type: Boolean, default: false },
// //   isOnboardingCompleted: { type: Boolean, default: false },
// //   isKycVerified: { type: Boolean, default: false },
// //   isDiscoverable: { type: Boolean, default: true },

// //   profileCompletedAt: Date,
// //   onboardingStartedAt: Date,
// //   onboardingCompletedAt: Date

// // }, { timestamps: true });

// // // Create geospatial index for proximity queries
// // ProfileSchema.index({ 'location': '2dsphere' });
// // module.exports = mongoose.model('Profile', ProfileSchema);

// const mongoose = require("mongoose");

// const PhotoSchema = new mongoose.Schema({
//   url: { type: String, required: true },
//   publicId: { type: String, required: true },
//   isPrimary: { type: Boolean, default: false },
//   order: { type: Number, default: 0 },
//   width: { type: Number },
//   height: { type: Number },
//   format: { type: String },
//   bytes: { type: Number },
//   uploadedAt: { type: Date, default: Date.now }
// }, { _id: false });

// const ProfileSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     unique: true,
//     index: true
//   },

//   // BASIC INFO
//   fullName: { type: String, trim: true },
//   nickname: { type: String, trim: true },
//   bio: { type: String, maxlength: 300 },

//   dob: { type: Date },
//   gender: { type: String, enum: ["male", "female", "other","trans"] },

//   // INTERESTS
//   interests: [{ type: String }],
//   relationshipGoal : [{ type: String }],
//   // PREFERENCES
//   preferences: {
//     ageRange: {
//       min: { type: Number, default: 18 },
//       max: { type: Number, default: 60 }
//       enum: ["Point"],
//       default: "Point"
//     },
//     coordinates: {
//       type: [Number], // [long, lat]
//       default: [0, 0],
//       index: "2dsphere"
//     },
//     city: String,
//     country: String
//   },
//   onboardingProgress: {
//   phoneVerified: { type: Boolean, default: false },
//   emailVerified: { type: Boolean, default: false },
//   basicInfo: { type: Boolean, default: false },   // dob, gender
//   updateLocation: { type: Boolean, default: false },
//   interestsSelected: { type: Boolean, default: false },
//   photosUploaded: { type: Boolean, default: false },
//   kycVerified: { type: Boolean, default: false },
//   preferencesSet: { type: Boolean, default: false },
// },

//   isProfileCompleted: { type: Boolean, default: false },
//   isOnboardingCompleted: { type: Boolean, default: false },
//   isKycVerified: { type: Boolean, default: false },
//   isDiscoverable: { type: Boolean, default: true },

//   profileCompletedAt: Date,
//   onboardingStartedAt: Date,
//   onboardingCompletedAt: Date
// }, { timestamps: true });

// // SPEED BOOST: compound index for swipe/search
// ProfileSchema.index({ isDiscoverable: 1, gender: 1 });
// ProfileSchema.index({ "location.coordinates": "2dsphere" });
// module.exports = mongoose.model("Profile", ProfileSchema);

// profile.model.js (Modified)

const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true, 
    index: true 
  },

  // --- 1. PROFILE BASIC INFO (Manager's Response Structure) ---
  nickname: { type: String, trim: true, index: true },
  dob: { type: Date },
  age: { type: Number }, 
  gender: { type: String }, // IDs: 'man', 'woman', 'non_binary', etc.
  pronouns: { type: String, default: null },
  height: { type: Number, default: null }, // Numeric (cm)
  weight: { type: Number, default: null },
  about: { type: String, maxlength: 500 }, // Manager's "about"
  jobTitle: { type: String, default: null },
  company: { type: String, default: null },
  school: { type: String, default: null },
  livingIn: { type: String, default: null },

  // --- 2. ATTRIBUTES (Figma Edit Profile & Enums) ---
  attributes: {
    // Basics
    zodiac: { type: String, default: null },
    education: { type: String, default: null },
    familyPlans: { type: String, default: null },
    personalityType: { type: String, default: null },
    communicationStyle: { type: String, default: null },
    loveStyle: { type: String, default: null },
    bloodType: { type: String, default: null },
    covidVaccine: { type: String, default: null },
    religion: { type: String, default: null },
    
    // Lifestyle
    pets: { type: String, default: null },
    drinking: { type: String, default: null },
    smoking: { type: String, default: null },
    workout: { type: String, default: null },
    dietary: { type: String, default: null },
    sleeping: { type: String, default: null },
    socialMedia: { type: String, default: null },
    
    // Arrays (Store Meta IDs)
    languages: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    music: { type: [String], default: [] },
    movies: { type: [String], default: [] },
    books: { type: [String], default: [] },
    travel: { type: [String], default: [] }
  },

  // --- 3. DISCOVERY PREFERENCES (Swipe Filters) ---
  discovery: {
    distanceRange: { type: Number, default: 50 , min: 1, max: 500}, // in km
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 60 }
    },
    showMeGender: { type: [String], default: [] }, 
    relationshipGoal: { type: String, default: null }, // Stored as ID String
    globalVisibility: { 
        type: String, 
        enum: ["everyone", "matches_only", "nobody"], 
        default: "everyone" 
    },
    filterRelationshipGoal: String,
    preferredInterests: [String],
  
  // Advanced Scoring Filters
  advancedFilters: {
    zodiac: [String],
    education: [String],
    familyPlans: String,
    personalityType: String,
    communicationStyle: String,
    loveStyle: String,
    pets: String,
    drinking: String,
    smoking: String,
    workout: String,
    dietary: String,
    socialMedia: String,
    sleeping: String
  }
  },

  // --- 4. MEDIA & LOCATION ---
  photos: [{
    id: { type: String },
    url: { type: String },
    publicId: { type: String },
    order: { type: Number }, // 0 is Main
    uploadedAt: { type: Date, default: Date.now }
  }],

  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [Longitude, Latitude]
    city: String,
    country: String,
    full_address: String
  },

  // --- 5. VERIFICATION (KYC) ---
  verification: {
    status: { 
        type: String, 
        enum: ["not_started", "pending", "approved", "rejected"], 
        default: "not_started" 
    },
    selfieUrl: String,
    docUrl: String,
    rejectionReason: String
  },

  // --- 6. SUBSCRIPTION & CONSUMABLES ---
  subscription: {
    planId: { type: String, default: "free" },
    isActive: { type: Boolean, default: false },
    expiryDate: Date,
    isTrial: { type: Boolean, default: false },
    superLikesCount: { type: Number, default: 0 },
    boostsCount: { type: Number, default: 0 },
    rewindsCount: { type: Number, default: 0 }
  },
  // --- 7. ONBOARDING & STATUS FLAGS ---
  onboardingProgress: {
    // Mandatory Flags
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    nicknameSet: { type: Boolean, default: false },
    dobSet: { type: Boolean, default: false },
    genderSet: { type: Boolean, default: false },
    relationshipGoalSet: { type: Boolean, default: false },
    genderPreferenceSet: { type: Boolean, default: false },
    ageRangeSet: { type: Boolean, default: false },
    distanceRangeSet: { type: Boolean, default: false },
    interestsSet: { type: Boolean, default: false },
    photosUploaded: { type: Boolean, default: false },
    selfieUploaded: { type: Boolean, default: false },
    idDocumentUploaded: { type: Boolean, default: false },
    locationSet: { type: Boolean, default: false },
    
    // Optional Flags
    bioSet: { type: Boolean, default: false },
    lifestyleSet: { type: Boolean, default: false },
    languagesSet: { type: Boolean, default: false },
    educationSet: { type: Boolean, default: false },
    
    // Calculated values
    mandatoryCompletion: { type: Number, default: 0 },
    optionalCompletion: { type: Number, default: 0 },
    totalCompletion: { type: Number, default: 0 },
    currentStep: { type: String, default: "nickname" },
    lastCompletedStep: { type: String }
  },

  // --- 8. SETTINGS & BLOCKS ---
  settings: {
    notifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      matches: { type: Boolean, default: true },
      messages: { type: Boolean, default: true }
    },
    blockedUsers: [{ type: String }], // Array of User IDs
    blockedContacts: [{ type: String }] // Array of Phone Hashes/Numbers
  },

  // --- 9. GLOBAL SYSTEM FLAGS ---
  isMandatoryComplete: { type: Boolean, default: false },
  isProfileComplete: { type: Boolean, default: false },
  // isDiscoverable: { type: Boolean, default: false },
  // canAccessSwipe: { type: Boolean, default: false },
  lastProfileUpdate: { type: Date }

}, { timestamps: true });

// Index for distance-based queries
ProfileSchema.index({ location: "2dsphere" });

// --- Profile Eligibility & Completion Logic ---
ProfileSchema.pre('save', function(next) {
  const profile = this;
  
  // 1. Mandatory Progress Check
  const hasNickname = !!profile.nickname;
  const hasDob = !!profile.dob;
  const hasGender = !!profile.gender;
  const hasLocation = !!(profile.location && profile.location.city);
  const hasMinPhotos = !!(profile.photos && profile.photos.length >= 1);
  const hasGoal = !!profile.discovery?.relationshipGoal;
  const hasInterests = !!(profile.attributes?.interests && profile.attributes.interests.length >= 3);

  // 2. Onboarding Progress Flags Update
  profile.onboardingProgress.nicknameSet = hasNickname;
  profile.onboardingProgress.dobSet = hasDob;
  profile.onboardingProgress.genderSet = hasGender;
  profile.onboardingProgress.photosUploaded = hasMinPhotos;
  profile.onboardingProgress.locationSet = hasLocation;
  profile.onboardingProgress.relationshipGoalSet = hasGoal;
  profile.onboardingProgress.interestsSet = hasInterests;

  // 3. Calculate Score (Industry Standard Weights)
  let score = 0;
  if (hasNickname) score += 15;
  if (hasDob) score += 10;
  if (hasGender) score += 10;
  if (hasLocation) score += 10;
  if (hasMinPhotos) score += 25; // Photos are high value
  if (hasGoal) score += 15;
  if (hasInterests) score += 15;
  
  profile.onboardingProgress.totalCompletion = score;

  // 4. ROBUST ELIGIBILITY CHECK (Production Approach)
  // Condition A: Mandatory profile fields complete?
  const isProfileReady = hasNickname && hasDob && hasGender && hasMinPhotos && hasLocation;
  
  // Condition B: KYC Status approved?
  // const isVerified = profile.verification?.status === 'approved';

  // Final System Flags
  profile.isMandatoryComplete = isProfileReady;
  
  // Robust Guard: User can ONLY swipe and be seen IF Profile is Ready AND KYC is Approved
  // if (isProfileReady && isVerified) {
  //   profile.canAccessSwipe = true;
  //   profile.isDiscoverable = true;
  // } else {
  //   profile.canAccessSwipe = false;
  //   profile.isDiscoverable = false;
  // }

  next();
});

module.exports = mongoose.model("Profile", ProfileSchema);





// ProfileSchema.pre('save', function(next) {
//   const profile = this;
//   const attr = profile.attributes || {};
  
//   let score = 0;

//   // --- 1. MANDATORY CORE (Total: 70%) ---
//   if (profile.nickname) score += 10;
//   if (profile.dob) score += 10;
//   if (profile.gender) score += 10;
//   if (profile.location?.city) score += 10;
//   if (profile.photos?.length >= 1) score += 10;
//   if (profile.photos?.length >= 2) score += 10; // Extra for 2nd photo
//   if (profile.discovery?.relationshipGoal) score += 10;

//   // --- 2. PROFILE DEPTH & TRAITS (Total: 30%) ---
//   // Basic Details (5%)
//   if (profile.about) score += 2;
//   if (profile.jobTitle || profile.school) score += 3;

//   // Interests & Languages (10%)
//   if (attr.interests?.length >= 5) score += 5;
//   if (attr.languages?.length >= 1) score += 5;

//   // Figma Traits - Chips (Total 15%)
//   // Hum har field ke liye 1-1 ya 2-2 points denge
//   const traits = [
//     'zodiac', 'education', 'familyPlans', 'personalityType', 
//     'communicationStyle', 'loveStyle', 'pets', 'drinking', 
//     'smoking', 'workout', 'dietary', 'religion'
//   ];

//   let filledTraits = 0;
//   traits.forEach(t => { if (attr[t]) filledTraits++; });
  
//   // Scoring traits: 15 points total for 12 traits (~1.25 per trait)
//   score += Math.round((filledTraits / traits.length) * 15);

//   // Final Score Cap
//   profile.onboardingProgress.totalCompletion = Math.min(score, 100);

//   // --- 3. SYSTEM FLAGS (The "Swipe Gate") ---
//   const isProfileReady = !!(profile.nickname && profile.dob && profile.gender && profile.photos?.length >= 2 && profile.location?.city);
//   const isVerified = profile.verification?.status === 'approved';

//   profile.isMandatoryComplete = isProfileReady;
  
//   // Swipe allowed only if Ready + Approved
//   if (isProfileReady && isVerified) {
//     profile.canAccessSwipe = true;
//     profile.isDiscoverable = true;
//   } else {
//     profile.canAccessSwipe = false;
//     profile.isDiscoverable = false;
//   }

//   next();
// });