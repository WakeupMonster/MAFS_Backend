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
// //   gender: { type: String, enum: ['male', 'female', 'other'] },

// //   interests: [{ type: String }], // tags / hobbies

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

const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  // ========================================
  // TIER 1: MANDATORY FIELDS (60%)
  // ========================================
  
  // Basic Info (20%)
  fullName: { type: String, trim: true },
  nickname: { type: String, trim: true, index: true },
  dob: { type: Date },
  age: { type: Number }, // Auto-calculated
  gender: {
    type: String,
    enum: ["male", "female", "non-binary", "trans-man", "trans-women", "genderqueer", "everyone", "other"]
  },

  // Relationship Goals (5%)
  // relationshipGoal: [{
  //   type: String,
  //   enum: ["dating", "friendship", "casual", "serious", "networking", "open_to_options"]
  // }],

 relationshipGoal: {
  key: {
    type: String,
    enum: [
      "dating",
      "friendship",
      "casual",
      "serious",
      "networking",
      "open_to_options"
    ],
    // required: true
  },
  title: {
    type: String,
    // required: true
  },
  subtitle: {
    type: String,
    // required: true
  }
},

  // Preferences (15%)
  preferences: {
    ageRange: {
      min: { type: Number, default: 18, min: 18 },
      max: { type: Number, default: 60, max: 100 }
    },
    distanceRange: { type: Number, default: 50, min: 1, max: 500 },
    genderPreference: [{
      type: String,
      enum: ["male", "female", "non-binary", "trans-man", "trans-women", "everyone", "other"]
    }]
  },


  discoveryFilters: {
  hasBio: { type: Boolean, default: false },

  interests: [{ type: String }],

  basics: {
    zodiac: [{ type: String }],
    education: [{ type: String }],
    familyPlans: [{ type: String }],
    PersonalityType: [{ type: String }],
    communicationStyle: [{ type: String }],
    loveStyle: [{ type: String }]
  },

  lifestyle: {
    pets: [{ type: String }],
    drinking: [{ type: String }],
    smokingHabits: [{ type: String }],
    exercise: [{ type: String }]
  }
},

  // Interests (5%)
  interests: [{ type: String }], // Min 3, Max 15

  // Photos (10%)
  // photos: [{
  //   url: { type: String, sparse: true },
  //   publicId: String,
  //   isPrimary: Boolean,
  //   order: Number,
  //   uploadedAt: Date
  // }],

  photos: {
  type: [{
    url: { type: String, sparse: true },
    publicId: String,
    isPrimary: Boolean,
    order: Number,
    uploadedAt: Date
  }],
  default: []
},
  location: {
  type: { 
    type: String, 
    enum: ["Point"], 
    default: "Point" 
  },
  coordinates: { 
    type: [Number], 
    default: [0, 0],  // This ensures new profiles get default coordinates
    validate: {
      validator: function(v) {
        return Array.isArray(v) && 
               v.length === 2 && 
               typeof v[0] === 'number' && 
               typeof v[1] === 'number';
      },
      message: 'Coordinates must be an array of two numbers [longitude, latitude]'
    }
  },
  city: String,
  state: String,
  country: String
  },
  // Location (5%)
  // location: {
  //   type: { type: String, enum: ["Point"], default: "Point" },
  //    coordinates: { 
  //   type: [Number], 
  //   default: [0, 0]  // Add this default
  // },
  //   city: String,
  //   state: String,
  //   country: String
  // },

  // ========================================
  // TIER 2: OPTIONAL FIELDS (40%)
  // ========================================
  
  bio: { type: String, maxlength: 500 }, // 5%

  // Lifestyle (13%)  
  lifestyle: {
    pets : {
      type: String,
      enum: ["dog","cat","bird","fish"]
    },
    drinkingHabits: {
      type: String,
      enum: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
    },
    smokingHabits: {
      type: String,
      enum: ["never", "socially", "regularly", "trying_to_quit"]
    },
    drinking: {
      type: String,
      enum: ["never", "socially", "regularly"]
    },
    exercise: {
      type: String,
      enum: ["never", "sometimes", "regularly", "daily"]
    }
  },
  basics : {
    education: {
    level: {
      type: String,
      enum: ["high_school", "bachelors", "masters", "phd", "trade_school", "prefer_not_to_say"]
    },
    institution: String
  },
    zodiac: {
      type: String,
      enum: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
    },
    familyPlans : {
      type : String,
    },
    PersonalityType : {
      type: String,
      enum: ["intj", "entj", "entp","istp","isfp"]
    },
    communicationStyle: {
      type: String,
      enum: ["chattyCathy", "listener", "joker", "deepThinker", "sarcasticWit","easyGoing","storyTeller","straightShooter"]
    },
    loveStyle : {
      type : String,
      enum : ["hopelessRomantic","bestFriend","adventureSeeker","careGiver"]
    } 
  },

  // Languages (5%)
  languages: [{ type: String }], // e.g., ["English", "Hindi", "Spanish"]



  // Communication & Preferences (12%)
  communicationStyle: {
    type: String,
    enum: ["frequent_texter", "phone_caller", "video_chatter", "in_person"]
  },
  
  musicPreference: [{
    type: String,
    enum: ["pop", "rock", "hip_hop", "classical", "jazz", "country", "electronic", "indie", "r&b", "folk", "metal", "other"]
  }],

    
  moviePreference: [{
    type: String,
    enum: ["action", "comedy", "drama", "horror", "romance", "sci_fi", "thriller", "animated", "documentary", "other"]
  }],

  bookPreference: [{
    type: String,
    enum: ["fiction", "non_fiction", "mystery", "romance", "sci_fi", "fantasy", "biography", "self_help", "poetry", "other"]
  }],

  travelPreference: {
    type: String,
    enum: ["adventure", "relaxation", "cultural", "budget", "luxury", "road_trips", "international", "domestic"]
  },



   // Personal Information
  height: {
    type: String,
    default: null  // Use null instead of empty string
  },
  jobtitle: {
    type: String,
    default: null
  },
  occupation: {
    type: String,
    default: null
  },
  about_me: {
    type: String,
    default: null
  },
  company: {
    type: String,
    default: null
  },
  school: {
    type: String,
    default: null
  },

  // ========================================
  // KYC (Inside Profile - Your Requirement)
  // ========================================
  kyc: {
    status: {
      type: String,
      enum: ["not_started", "pending", "approved", "rejected"],
      default: "not_started"
    },
    selfie: {
      url: String,
      publicId: String,
      uploadedAt: Date
    },
    idDocument: {
      type: { type: String, enum: ["driving_license", "passport", "proof_of_age"] },
      frontUrl: String,
      frontPublicId: String,
      backUrl: String,
      backPublicId: String,
      uploadedAt: Date
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: mongoose.Schema.Types.ObjectId,
    rejectionReason: String
  },



   visibility: {
    type: String,
    enum: ["everyone", "matches_only", "nobody"],
    default: "everyone"
  },
  


  // ========================================
  // PROGRESS TRACKING (Auto-calculated)
  // ========================================
  onboardingProgress: {
    // Tier 1 (Mandatory)
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
    
    // Tier 2 (Optional)
    bioSet: { type: Boolean, default: false },
    lifestyleSet: { type: Boolean, default: false },
    languagesSet: { type: Boolean, default: false },
    educationSet: { type: Boolean, default: false },
    communicationStyleSet: { type: Boolean, default: false },
    musicPreferenceSet: { type: Boolean, default: false },
    bookPreferenceSet: { type: Boolean, default: false },
    travelPreferenceSet: { type: Boolean, default: false },
    
    // Calculated
    mandatoryCompletion: { type: Number, default: 0 }, // 0-60
    optionalCompletion: { type: Number, default: 0 },  // 0-40
    totalCompletion: { type: Number, default: 0 },     // 0-100
    currentStep: String,
    lastCompletedStep: String
  },

  // ========================================
  // STATUS FLAGS
  // ========================================
  isMandatoryComplete: { type: Boolean, default: false }, // 60% done
  isProfileComplete: { type: Boolean, default: false },    // 100% done
  canAccessSwipe: { type: Boolean, default: false },
  isDiscoverable: { type: Boolean, default: false },

  // Timestamps
  lastProfileUpdate: Date

}, { timestamps: true });




// ========================================
// METHODS (Auto-calculate everything)
// ========================================

ProfileSchema.methods.calculateCompletion = function() {
  const progress = this.onboardingProgress;
  
  // Tier 1 weights (must sum to 60)
  const TIER1_WEIGHTS = {
    phoneVerified: 5,
    emailVerified: 5,
    nicknameSet: 5,
    dobSet: 5,
    genderSet: 5,
    relationshipGoalSet: 5,
    genderPreferenceSet: 5,
    ageRangeSet: 5,
    distanceRangeSet: 5,
    interestsSet: 5,
    photosUploaded: 10,
    selfieUploaded: 5,
    idDocumentUploaded: 5
    // locationSet: 0 (optional, doesn't block)
  };
  
  // Tier 2 weights (must sum to 40)
  const TIER2_WEIGHTS = {
    bioSet: 5,
    lifestyleSet: 8,
    languagesSet: 5,
    educationSet: 5,
    communicationStyleSet: 3,
    musicPreferenceSet: 4,
    bookPreferenceSet: 3,
    travelPreferenceSet: 4,
    // Extra photos covered in photosUploaded
  };
  
  // Calculate Tier 1 (Mandatory)
  let tier1Total = 0;
  for (const [key, weight] of Object.entries(TIER1_WEIGHTS)) {
    if (progress[key]) tier1Total += weight;
  }
  
  // Calculate Tier 2 (Optional)
  let tier2Total = 0;
  for (const [key, weight] of Object.entries(TIER2_WEIGHTS)) {
    if (progress[key]) tier2Total += weight;
  }
  
  // Update progress
  this.onboardingProgress.mandatoryCompletion = tier1Total;
  this.onboardingProgress.optionalCompletion = tier2Total;
  this.onboardingProgress.totalCompletion = tier1Total + tier2Total;
  
  // Check mandatory complete (60%)
  this.isMandatoryComplete = (tier1Total >= 60);
  
  // Check full complete (100%)
  this.isProfileComplete = (tier1Total + tier2Total >= 100);
  
  return {
    mandatory: tier1Total,
    optional: tier2Total,
    total: tier1Total + tier2Total
  };
};

ProfileSchema.methods.getNextStep = function() {
  const progress = this.onboardingProgress;
  
  // Define strict orderscreen
  const MANDATORY_STEPS = [
    { key: "phoneVerified", screen: "phone_verification", message: "Verify phone" },
    { key: "emailVerified", screen: "email_verification", message: "Verify email" },
    { key: "nicknameSet", screen: "nickname", message: "Choose nickname" },
    { key: "dobSet", screen: "birthdate", message: "Enter birthdate" },
    { key: "genderSet", screen: "gender", message: "Select gender" },
    { key: "relationshipGoalSet", screen: "relationship_goals", message: "What are you looking for?" },
    { key: "genderPreferenceSet", screen: "gender_preference", message: "Who do you want to meet?" },
    { key: "ageRangeSet", screen: "age_range", message: "Set age range" },
    { key: "distanceRangeSet", screen: "distance_range", message: "Set distance" },
    { key: "interestsSet", screen: "interests", message: "Choose interests" },
    { key: "photosUploaded", screen: "photos", message: "Add photos" },
    { key: "selfieUploaded", screen: "selfie", message: "Selfie verification" },
    { key: "idDocumentUploaded", screen: "id_document", message: "Upload ID" },
    { key: "locationSet", screen: "location", message: "Enable location" }
  ];
  
  // Find first incomplete mandatory step
  for (const step of MANDATORY_STEPS) {
    if (!progress[step.key]) {
      return { screen: step.screen, message: step.message, tier: "mandatory" };
    }
  }
  
  // All mandatory done - check KYC
  if (this.kyc.status === "pending") {
    return { screen: "kyc_pending", message: "Verification in review", tier: "kyc" };
  }
  
  if (this.kyc.status === "rejected") {
    return { screen: "kyc_rejected", message: "Verification rejected", tier: "kyc" };
  }
  
  if (this.kyc.status === "approved" && this.isMandatoryComplete) {
    // User can access swipe, but suggest optional fields
    const OPTIONAL_STEPS = [
      { key: "bioSet", screen: "bio", message: "Add bio" },
      { key: "lifestyleSet", screen: "lifestyle", message: "Share lifestyle" },
      { key: "languagesSet", screen: "languages", message: "Languages you know" },
      { key: "educationSet", screen: "education", message: "Education" },
      { key: "communicationStyleSet", screen: "communication", message: "Communication style" },
      { key: "musicPreferenceSet", screen: "music", message: "Music preference" },
      { key: "bookPreferenceSet", screen: "books", message: "Book preference" },
      { key: "travelPreferenceSet", screen: "travel", message: "Travel style" }
    ];
    
    // Find first incomplete optional step
    for (const step of OPTIONAL_STEPS) {
      if (!progress[step.key]) {
        return { 
          screen: step.screen, 
          message: step.message, 
          tier: "optional",
          canSkip: true // User can skip to home
        };
      }
    }
    
    // Everything 100% complete!
    return { screen: "home", message: "Profile complete!", tier: "complete" };
  }
  
  return { screen: "kyc_pending", message: "Complete verification", tier: "kyc" };
};

// Auto-update on save
ProfileSchema.pre("save", function(next) {
  // Calculate age
  if (this.dob) {
    const today = new Date();
    const birth = new Date(this.dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    this.age = age;
  }
  
  // Update progress flags
  this.onboardingProgress.nicknameSet = Boolean(this.nickname);
  this.onboardingProgress.dobSet = Boolean(this.dob);
  this.onboardingProgress.genderSet = Boolean(this.gender);
  this.onboardingProgress.relationshipGoalSet = this.relationshipGoal?.length > 0;
  this.onboardingProgress.genderPreferenceSet = this.preferences?.genderPreference?.length > 0;
  this.onboardingProgress.ageRangeSet = Boolean(this.preferences?.ageRange?.min);
  this.onboardingProgress.distanceRangeSet = Boolean(this.preferences?.distanceRange);
  this.onboardingProgress.interestsSet = this.interests?.length >= 3;
  this.onboardingProgress.photosUploaded = this.photos?.length >= 2;
  this.onboardingProgress.selfieUploaded = Boolean(this.kyc?.selfie?.url);
  this.onboardingProgress.idDocumentUploaded = Boolean(this.kyc?.idDocument?.frontUrl);
  this.onboardingProgress.locationSet = Boolean(this.location?.coordinates?.[0]);
  
  // Tier 2 (Optional)
  this.onboardingProgress.bioSet = Boolean(this.bio);
  this.onboardingProgress.lifestyleSet = Boolean(this.lifestyle?.religiousBeliefs || this.lifestyle?.zodiacSign);
  this.onboardingProgress.languagesSet = this.languages?.length > 0;
  this.onboardingProgress.educationSet = Boolean(this.education?.level);
  this.onboardingProgress.communicationStyleSet = Boolean(this.communicationStyle);
  this.onboardingProgress.musicPreferenceSet = this.musicPreference?.length > 0;
  this.onboardingProgress.bookPreferenceSet = this.bookPreference?.length > 0;
  this.onboardingProgress.travelPreferenceSet = Boolean(this.travelPreference);
  
  // Calculate completion
  this.calculateCompletion();
  
  // Enable swipe access
  this.onboardingProgress.isProfileComplete = this.isProfileComplete;
  this.onboardingProgress.canAccessSwipe = this.canAccessSwipe;
  this.canAccessSwipe = this.isMandatoryComplete && this.kyc.status === "approved";
  this.isDiscoverable = this.canAccessSwipe;

  // 🔒 If profile is manually hidden (deactivated), do NOT override
if (this.visibility === "nobody") {
  this.canAccessSwipe = false;
  this.isDiscoverable = false;
} else {
  this.canAccessSwipe =
    this.isMandatoryComplete && this.kyc.status === "approved";
  this.isDiscoverable = this.canAccessSwipe;
}

  
  this.lastProfileUpdate = new Date();
  
  next();
});



// ========================================
// 🔥 NEW: PRE-UPDATE HOOK (For CLI/Admin Updates)
// ========================================
ProfileSchema.pre(['findOneAndUpdate', 'updateOne'], async function(next) {
  const update = this.getUpdate();
  
  // Check if KYC status is being updated
  const kycStatusUpdate = update.$set?.['kyc.status'] || update['kyc.status'];
  
  if (kycStatusUpdate) {
    // Fetch current document
    const docToUpdate = await this.model.findOne(this.getQuery());
    
    if (docToUpdate) {
      // Recalculate completion
      docToUpdate.calculateCompletion();
      
      const isMandatoryComplete = docToUpdate.isMandatoryComplete;
      const isKycApproved = kycStatusUpdate === "approved";
      
      // 🔒 Respect visibility setting
      if (docToUpdate.visibility === "nobody") {
        update.$set = update.$set || {};
        update.$set.canAccessSwipe = false;
        update.$set.isDiscoverable = false;
      } else {
        // ✅ Update access flags
        update.$set = update.$set || {};
        update.$set.canAccessSwipe = isMandatoryComplete && isKycApproved;
        update.$set.isDiscoverable = isMandatoryComplete && isKycApproved;
        update.$set.lastProfileUpdate = new Date();
      }
    }
  }
  
  next();
});

// ========================================
// 🔥 NEW: POST-UPDATE HOOK (Verification)
// ========================================
ProfileSchema.post(['findOneAndUpdate', 'updateOne'], async function(doc) {
  if (doc) {
    console.log(`✅ Profile updated: canAccessSwipe=${doc.canAccessSwipe}, isDiscoverable=${doc.isDiscoverable}`);
  }
});
ProfileSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Profile", ProfileSchema);


// Add this before the model is created
// ProfileSchema.pre('save', function(next) {
//   if (this.isModified('kyc.status') && this.kyc.status === 'approved') {
//     this.canAccessSwipe = true;
//     this.isDiscoverable = true;
//     this.isProfileComplete = true;
//     this.isMandatoryComplete = true;
//   }
//   next();
// });