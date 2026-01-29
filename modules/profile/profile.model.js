const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true, 
    index: true 
  },

  nickname: { type: String, trim: true, index: true },
  dob: { type: Date },
  age: { type: Number }, 
  gender: { type: String },
  pronouns: { type: String, default: null },
  height: { type: Number, default: null },
  weight: { type: Number, default: null },
  about: { type: String, maxlength: 500 }, 
  jobTitle: { type: String, default: null },
  company: { type: String, default: null },
  school: { type: String, default: null },
  livingIn: { type: String, default: null },

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
    state: String, 
    country: String,
    full_address: String
  },


  verification: {
    status: { 
        type: String, 
        enum: ["not_started", "pending", "approved", "rejected"], 
        default: "not_started",
        index: true 
    },
    verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
   verifiedAt: {
    type: Date,
    default: null
  },
   submittedAt: {
        type: Date,
        default: null
    },
    selfieUrl: String,
    docUrl: String,
    rejectionReason: {
      type : String,
      default : null
    }
  },

  subscription: {
    planId: { type: String, default: "free" },
    isActive: { type: Boolean, default: false },
    expiryDate: Date,
    isTrial: { type: Boolean, default: false },
    superLikesCount: { type: Number, default: 0 },
    boostsCount: { type: Number, default: 0 },
    rewindsCount: { type: Number, default: 0 }
  },
  onboardingProgress: {
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
    
    bioSet: { type: Boolean, default: false },
    lifestyleSet: { type: Boolean, default: false },
    languagesSet: { type: Boolean, default: false },
    educationSet: { type: Boolean, default: false },
    
    mandatoryCompletion: { type: Number, default: 0 },
    optionalCompletion: { type: Number, default: 0 },
    totalCompletion: { type: Number, default: 0 },
    currentStep: { type: String, default: "nickname" },
    lastCompletedStep: { type: String }
  },

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

  isMandatoryComplete: { type: Boolean, default: false },
  isProfileComplete: { type: Boolean, default: false },
  lastProfileUpdate: { type: Date }

}, { timestamps: true });

ProfileSchema.index({ location: "2dsphere" });

ProfileSchema.pre('save', function(next) {
  const profile = this;
  
  const hasNickname = !!profile.nickname;
  const hasDob = !!profile.dob;
  const hasGender = !!profile.gender;
  const hasLocation = !!(profile.location && profile.location.city);
  const hasMinPhotos = !!(profile.photos && profile.photos.length >= 1);
  const hasGoal = !!profile.discovery?.relationshipGoal;
  const hasInterests = !!(profile.attributes?.interests && profile.attributes.interests.length >= 3);

  profile.onboardingProgress.nicknameSet = hasNickname;
  profile.onboardingProgress.dobSet = hasDob;
  profile.onboardingProgress.genderSet = hasGender;
  profile.onboardingProgress.photosUploaded = hasMinPhotos;
  profile.onboardingProgress.locationSet = hasLocation;
  profile.onboardingProgress.relationshipGoalSet = hasGoal;
  profile.onboardingProgress.interestsSet = hasInterests;

  let score = 0;
  if (hasNickname) score += 15;
  if (hasDob) score += 10;
  if (hasGender) score += 10;
  if (hasLocation) score += 10;
  if (hasMinPhotos) score += 25; 
  if (hasGoal) score += 15;
  if (hasInterests) score += 15;
  
  profile.onboardingProgress.totalCompletion = score;

  const isProfileReady = hasNickname && hasDob && hasGender && hasMinPhotos && hasLocation;

  profile.isMandatoryComplete = isProfileReady;
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