const mongoose = require("mongoose");

const GENDER_OPTIONS = [
  "men",
  "women",
  "non-binary",
  "trans-man",
  "trans-women",
  "genderqueer",
  "everyone",
];

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    //admin name
    fullName: {
      type: String,
    },
    nickname: { type: String, trim: true, index: true },
    dob: { type: Date },
    age: { type: Number },
    // gender: { type: String },
    gender: {
      type: String,
      enum: {
        values: GENDER_OPTIONS,
        message: "{VALUE} is not a valid gender option",
      },
      index: true,
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
      travel: { type: [String], default: [] },
    },

    discovery: {
      distanceRange: { type: Number, default: 50, min: 1, max: 500 }, // in km
      ageRange: {
        min: { type: Number, default: 18 },
        max: { type: Number, default: 60 },
      },
      // showMeGender: { type: [String], default: null },
      showMeGender: {
        type: [String], // Array of Strings
        enum: {
          values: GENDER_OPTIONS,
          message: "{VALUE} is not a valid option for showMeGender",
        },
        default: [], // ✅ BEST PRACTICE: Array ka default [] rakhein, null nahi.
      },
      relationshipGoal: { type: String, default: null }, // Stored as ID String
      // globalVisibility: {
      //   type: String,
      //   enum: ["everyone", "matches_only", "nobody"],
      //   default: "everyone",
      // },
      globalVisibility: {
        type: String,
        enum: ["everyone", "private"],
        default: "everyone",
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
        sleeping: [String],
      },
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
      full_address: String,
    },

    verification: {
      status: {
        type: String,
        enum: ["not_started", "pending", "approved", "rejected"],
        default: "not_started",
        index: true,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
      selfieUrl: String,
      docUrl: String,
      rejectionReason: {
        type: String,
        default: null,
      },
    },

    subscription: {
      planId: { type: String, default: "free" },
      isActive: { type: Boolean, default: false },
      expiryDate: Date,
      isTrial: { type: Boolean, default: false },
      superLikesCount: { type: Number, default: 0 },
      boostsCount: { type: Number, default: 0 },
      rewindsCount: { type: Number, default: 0 },
    },
    onboardingProgress: {
      // Boolean flags (backward compatibility)
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

      // Section-wise scores (new UI sections)
      photosScore: { type: Number, default: 0 }, // max 25
      basicInfoScore: { type: Number, default: 0 }, // max 23
      careerScore: { type: Number, default: 0 }, // max 12
      basicsScore: { type: Number, default: 0 }, // max 15
      lifestyleScore: { type: Number, default: 0 }, // max 15
      preferencesScore: { type: Number, default: 0 }, // max 5
      verificationScore: { type: Number, default: 0 }, // max 5

      // Totals
      mandatoryCompletion: { type: Number, default: 0 },
      optionalCompletion: { type: Number, default: 0 },
      totalCompletion: { type: Number, default: 0 },
      currentStep: { type: String, default: "nickname" },
      lastCompletedStep: { type: String },
    },

    onboarding: {
      nextstep: {
        type: Number,
        default: 1,
        min: 1,
      },
      currentScreenSlug: {
        type: String,
        default: "welcome_screen",
        index: true,
      },
      isComplete: {
        type: Boolean,
        default: false,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    settings: {
      notifications: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        likes: { type: Boolean, default: true },
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

ProfileSchema.pre("validate", function (next) {
  const profile = this;

  // Sanitize discovery.globalVisibility to fit ["everyone", "private"]
  if (profile.discovery && profile.discovery.globalVisibility) {
    if (!["everyone", "private"].includes(profile.discovery.globalVisibility)) {
      profile.discovery.globalVisibility = "private";
    }
  }

  const attr = profile.attributes || {};

  /*
  // ========================================
  // OLD PERCENTAGE LOGIC (Commented out as requested)
  // ========================================
  // SECTION 1: PHOTOS (max 25%)
  // Tier-based: 1-2→10, 3-4→15, 5→20, 6+→25
  const photoCount = (profile.photos && profile.photos.length) || 0;
  let photosScore = 0;
  if (photoCount >= 6) photosScore = 25;
  else if (photoCount >= 5) photosScore = 20;
  else if (photoCount >= 3) photosScore = 15;
  else if (photoCount >= 1) photosScore = 10;

  // SECTION 2: BASIC INFO (max 23%)
  let basicInfoScore = 0;
  if (profile.nickname) basicInfoScore += 3;
  if (profile.dob) basicInfoScore += 4;
  if (profile.gender) basicInfoScore += 4;
  if (profile.height) basicInfoScore += 4;
  if (profile.livingIn) basicInfoScore += 4;
  if (profile.about) basicInfoScore += 4;

  // SECTION 3: CAREER & EDUCATION (max 12%)
  const careerFields = ['jobTitle', 'company', 'school'];
  const filledCareer = careerFields.filter(f => !!profile[f]).length;
  const careerScore = (filledCareer / 3) * 12;

  // SECTION 4: BASICS (max 15%)
  const basicsFields = ['zodiac', 'education', 'familyPlans', 'personalityType',
    'communicationStyle', 'loveStyle', 'socialMedia'];
  const filledBasics = basicsFields.filter(f => !!attr[f]).length;
  const basicsScore = (filledBasics / 7) * 15;

  // SECTION 5: LIFESTYLE (max 15%)
  const lifestyleFields = ['pets', 'drinking', 'smoking', 'workout', 'dietary', 'sleeping'];
  const filledLifestyle = lifestyleFields.filter(f => !!attr[f]).length;
  const lifestyleScore = (filledLifestyle / 6) * 15;

  // SECTION 6: PREFERENCES (max 5%)
  const prefFields = ['music', 'movies', 'books', 'travel'];
  const filledPrefs = prefFields.filter(f => attr[f] && attr[f].length >= 1).length;
  const preferencesScore = (filledPrefs / 4) * 5;

  // SECTION 7: VERIFICATION (max 5%)
  const hasSelfie = !!profile.verification?.selfieUrl;
  const hasIdDocument = !!profile.verification?.docUrl;
  const verificationScore = (hasSelfie ? 2.5 : 0) + (hasIdDocument ? 2.5 : 0);
  */

  // ========================================
  // NEW PERCENTAGE LOGIC (100% Total)
  // ========================================

  // SECTION 1: PHOTOS (max 25%) - UNCHANGED
  const photoCount = (profile.photos && profile.photos.length) || 0;
  let photosScore = 0;
  if (photoCount >= 6) photosScore = 25;
  else if (photoCount >= 5) photosScore = 20;
  else if (photoCount >= 3) photosScore = 15;
  else if (photoCount >= 1) photosScore = 10;

  // SECTION 2: BASIC INFO (max 20%) - 6 fields
  const basicInfoFields = [
    "nickname",
    "dob",
    "gender",
    "height",
    "livingIn",
    "about",
  ];
  const filledBasicInfo = basicInfoFields.filter((f) => !!profile[f]).length;
  const basicInfoScore = (filledBasicInfo / 6) * 20;

  // SECTION 3: CAREER & EDUCATION (max 9%) - 3 fields, 3% each
  const careerFields = ["jobTitle", "company", "school"];
  const filledCareer = careerFields.filter((f) => !!profile[f]).length;
  const careerScore = (filledCareer / 3) * 9;

  // SECTION 4: BASICS (max 15%) - 7 fields
  const basicsFields = [
    "zodiac",
    "education",
    "familyPlans",
    "personalityType",
    "communicationStyle",
    "loveStyle",
    "socialMedia",
  ];
  const filledBasics = basicsFields.filter((f) => !!attr[f]).length;
  const basicsScore = (filledBasics / 7) * 15;

  // SECTION 5: LIFESTYLE (max 12%) - 6 fields, 2% each
  const lifestyleFields = [
    "pets",
    "drinking",
    "smoking",
    "workout",
    "dietary",
    "sleeping",
  ];
  const filledLifestyle = lifestyleFields.filter((f) => !!attr[f]).length;
  const lifestyleScore = (filledLifestyle / 6) * 12;

  // SECTION 6: PREFERENCES (max 17%)
  // Interests (4%), Languages (4%), Religion (4%)
  // Music (1.25%), Movies (1.25%), Books (1.25%), Travel (1.25%)

  // Helper to check if array has at least one real non-empty string
  const hasValidItems = (arr) =>
    arr &&
    Array.isArray(arr) &&
    arr.filter((i) => typeof i === "string" && i.trim() !== "").length >= 1;

  let preferencesScore = 0;
  if (hasValidItems(attr.interests)) preferencesScore += 4;
  if (hasValidItems(attr.languages)) preferencesScore += 4;
  if (
    attr.religion &&
    typeof attr.religion === "string" &&
    attr.religion.trim() !== ""
  )
    preferencesScore += 4;

  const minorPrefFields = ["music", "movies", "books", "travel"];
  const filledMinorPrefs = minorPrefFields.filter((f) =>
    hasValidItems(attr[f]),
  ).length;
  preferencesScore += filledMinorPrefs * 1.25;

  // SECTION 7: VERIFICATION (max 2%)
  const hasSelfie = !!profile.verification?.selfieUrl;
  const hasIdDocument = !!profile.verification?.docUrl;
  const verificationScore = (hasSelfie ? 1 : 0) + (hasIdDocument ? 1 : 0);

  // ========================================
  // STORE SECTION SCORES
  // ========================================
  profile.onboardingProgress.photosScore = photosScore;
  profile.onboardingProgress.basicInfoScore = basicInfoScore;
  profile.onboardingProgress.careerScore = careerScore;
  profile.onboardingProgress.basicsScore = basicsScore;
  profile.onboardingProgress.lifestyleScore = lifestyleScore;
  profile.onboardingProgress.preferencesScore = preferencesScore;
  profile.onboardingProgress.verificationScore = verificationScore;

  // ========================================
  // TOTAL COMPLETION
  // ========================================
  const total =
    photosScore +
    basicInfoScore +
    careerScore +
    basicsScore +
    lifestyleScore +
    preferencesScore +
    verificationScore;
  profile.onboardingProgress.totalCompletion = Math.min(Math.round(total), 100);

  // ========================================
  // UPDATE BOOLEAN FLAGS (backward compat)
  // ========================================
  profile.onboardingProgress.nicknameSet = !!profile.nickname;
  profile.onboardingProgress.dobSet = !!profile.dob;
  profile.onboardingProgress.genderSet = !!profile.gender;
  profile.onboardingProgress.photosUploaded = photoCount >= 1;
  profile.onboardingProgress.locationSet = !!(
    profile.location && profile.location.city
  );
  profile.onboardingProgress.relationshipGoalSet =
    !!profile.discovery?.relationshipGoal;
  profile.onboardingProgress.interestsSet = !!(
    attr.interests && attr.interests.length >= 3
  );
  profile.onboardingProgress.selfieUploaded = hasSelfie;
  profile.onboardingProgress.idDocumentUploaded = hasIdDocument;
  profile.onboardingProgress.bioSet = !!profile.about;

  // ========================================
  // MANDATORY CHECK (unchanged logic)
  // ========================================
  const isProfileReady =
    !!profile.nickname &&
    !!profile.dob &&
    !!profile.gender &&
    photoCount >= 1 &&
    !!(profile.location && profile.location.city);
  profile.isMandatoryComplete = isProfileReady;

  next();
});

module.exports = mongoose.model("Profile", ProfileSchema);
