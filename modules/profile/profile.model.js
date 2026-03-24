const mongoose = require("mongoose");

const GENDER_OPTIONS = [
  "men",
  "women",
  "non-binary",
  "trans-man",
  "trans-women",
  "genderqueer",
  "everyone"
];

const ProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  //admin name
  fullName: {
    type: String
  },
  nickname: { type: String, trim: true, index: true },
  dob: { type: Date },
  age: { type: Number },
  // gender: { type: String },
  gender: {
    type: String,
    enum: {
      values: GENDER_OPTIONS,
      message: '{VALUE} is not a valid gender option'
    },
    index: true
  },
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
    zodiac: { type: String, default: "" },
    education: { type: String, default: "" },
    familyPlans: { type: String, default: "" },
    personalityType: { type: String, default: "" },
    communicationStyle: { type: String, default: "" },
    loveStyle: { type: String, default: "" },
    bloodType: { type: String, default: "" },
    covidVaccine: { type: String, default: "" },
    religion: { type: String, default: "" },

    // Lifestyle
    pets: { type: String, default: "" },
    drinking: { type: String, default: "" },
    smoking: { type: String, default: "" },
    workout: { type: String, default: "" },
    dietary: { type: String, default: "" },
    sleeping: { type: String, default: "" },
    socialMedia: { type: String, default: "" },

    // Arrays (Store Meta IDs)
    languages: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    music: { type: [String], default: [] },
    movies: { type: [String], default: [] },
    books: { type: [String], default: [] },
    travel: { type: [String], default: [] }
  },

  discovery: {
    distanceRange: { type: Number, default: 50, min: 1, max: 500 }, // in km
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 60 }
    },
    // showMeGender: { type: [String], default: null }, 
    showMeGender: {
      type: [String], // Array of Strings
      enum: {
        values: GENDER_OPTIONS,
        message: '{VALUE} is not a valid option for showMeGender'
      },
      default: [] // ✅ BEST PRACTICE: Array ka default [] rakhein, null nahi.
    },
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
      familyPlans: [String],
      personalityType: [String],
      communicationStyle: [String],
      loveStyle: [String],
      pets: [String],
      drinking: [String],
      smoking: [String],
      workout: [String],
      dietary: [String],
      socialMedia: [String],
      sleeping: [String]
    }
  },

    photos: [
      {
        id: { type: String },
        url: { type: String },
        publicId: { type: String },
        order: { type: Number }, // 0 is Main
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

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
      type: String,
      default: null
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


  onboarding: {
    nextstep: {
      type: Number,
      default: 1,
      min: 1
    },
    currentScreenSlug: {
      type: String,
      default: "welcome_screen",
      index: true
    },
    isComplete: {
      type: Boolean,
      default: false
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },


    settings: {
      notifications: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        matches: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
      },
      blockedUsers: [{ type: String }], // Array of User IDs
      blockedContacts: [{ type: String }], // Array of Phone Hashes/Numbers
    },

    isMandatoryComplete: { type: Boolean, default: false },
    isProfileComplete: { type: Boolean, default: false },
    lastProfileUpdate: { type: Date },
  },
  { timestamps: true },
);

ProfileSchema.index({ location: "2dsphere" });

// ProfileSchema.pre('save', function(next) {
//   const profile = this;

//   const hasNickname = !!profile.nickname;
//   const hasDob = !!profile.dob;
//   const hasGender = !!profile.gender;
//   const hasLocation = !!(profile.location && profile.location.city);
//   const hasMinPhotos = !!(profile.photos && profile.photos.length >= 1);
//   const hasGoal = !!profile.discovery?.relationshipGoal;
//   const hasInterests = !!(profile.attributes?.interests && profile.attributes.interests.length >= 3);

//   profile.onboardingProgress.nicknameSet = hasNickname;
//   profile.onboardingProgress.dobSet = hasDob;
//   profile.onboardingProgress.genderSet = hasGender;
//   profile.onboardingProgress.photosUploaded = hasMinPhotos;
//   profile.onboardingProgress.locationSet = hasLocation;
//   profile.onboardingProgress.relationshipGoalSet = hasGoal;
//   profile.onboardingProgress.interestsSet = hasInterests;

//   let score = 0;
//   if (hasNickname) score += 15;
//   if (hasDob) score += 10;
//   if (hasGender) score += 10;
//   if (hasLocation) score += 10;
//   if (hasMinPhotos) score += 25; 
//   if (hasGoal) score += 15;
//   if (hasInterests) score += 15;

//   profile.onboardingProgress.totalCompletion = score;

//   const isProfileReady = hasNickname && hasDob && hasGender && hasMinPhotos && hasLocation;

//   profile.isMandatoryComplete = isProfileReady;
//   next();
// });



ProfileSchema.pre('save', function (next) {
  const profile = this;
  const attr = profile.attributes || {};

  // ========================================
  // CATEGORY 1: ONBOARDING STEPS (50% max)
  // ========================================
  const hasNickname = !!profile.nickname;
  const hasDob = !!profile.dob;
  const hasGender = !!profile.gender;
  const hasLocation = !!(profile.location && profile.location.city);
  const hasMinPhotos = !!(profile.photos && profile.photos.length >= 1);
  const hasGoal = !!profile.discovery?.relationshipGoal;
  const hasInterests = !!(attr.interests && attr.interests.length >= 3);
  const hasSelfie = !!profile.verification?.selfieUrl;
  const hasIdDocument = !!profile.verification?.docUrl;

  // Update onboarding flags
  profile.onboardingProgress.nicknameSet = hasNickname;
  profile.onboardingProgress.dobSet = hasDob;
  profile.onboardingProgress.genderSet = hasGender;
  profile.onboardingProgress.photosUploaded = hasMinPhotos;
  profile.onboardingProgress.locationSet = hasLocation;
  profile.onboardingProgress.relationshipGoalSet = hasGoal;
  profile.onboardingProgress.interestsSet = hasInterests;
  profile.onboardingProgress.selfieUploaded = hasSelfie;
  profile.onboardingProgress.idDocumentUploaded = hasIdDocument;

  let onboardingScore = 0;
  if (hasNickname) onboardingScore += 7;
  if (hasDob) onboardingScore += 5;
  if (hasGender) onboardingScore += 5;
  if (hasLocation) onboardingScore += 5;
  if (hasMinPhotos) onboardingScore += 10;
  if (hasGoal) onboardingScore += 6;
  if (hasInterests) onboardingScore += 6;
  if (hasSelfie) onboardingScore += 3;
  if (hasIdDocument) onboardingScore += 3;
  // Onboarding Max: 50

  // ========================================
  // CATEGORY 2: PROFILE ATTRIBUTES (50% max)
  // ========================================
  let attributeScore = 0;

  // Group A: Basics (20% total — 2.5 each × 8 fields)
  const basics = ['zodiac', 'education', 'familyPlans', 'personalityType',
    'communicationStyle', 'loveStyle', 'religion'];
  basics.forEach(field => {
    if (attr[field]) attributeScore += 2.5;
  });
  if (attr.languages && attr.languages.length >= 1) attributeScore += 2.5;

  // Group B: Lifestyle (18% total — 3 each × 6 fields)
  const lifestyle = ['pets', 'drinking', 'smoking', 'workout', 'dietary', 'sleeping'];
  lifestyle.forEach(field => {
    if (attr[field]) attributeScore += 3;
  });

  // Group C: Preference Arrays (8% total — 2 each × 4 fields)
  const preferences = ['music', 'movies', 'books', 'travel'];
  preferences.forEach(field => {
    if (attr[field] && attr[field].length >= 1) attributeScore += 2;
  });

  // Group D: Extra Profile Info (4% total — 2 each × 2 fields)
  if (profile.about) attributeScore += 2;
  if (attr.socialMedia) attributeScore += 2;
  // Attributes Max: 50

  // ========================================
  // FINAL TOTAL SCORE
  // ========================================
  profile.onboardingProgress.totalCompletion = Math.min(Math.round(onboardingScore + attributeScore), 100);

  // Mandatory check (untouched — existing logic)
  const isProfileReady = hasNickname && hasDob && hasGender && hasMinPhotos && hasLocation;
  profile.isMandatoryComplete = isProfileReady;

  next();
});


module.exports = mongoose.model("Profile", ProfileSchema);