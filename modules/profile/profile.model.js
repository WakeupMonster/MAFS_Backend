// // // // // src/modules/profile/profile.model.js
// // // // const mongoose = require('mongoose');
// // // // const ProfileSchema = new mongoose.Schema({

// // // //   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth', required: true },

// // // //   nickname: String,
// // // //   fullName: String,
// // // //   bio: { type: String, maxlength: 300 },

// // // //   dob: Date,
// // // //   gender: String,
// // // //   interestedIn: [String],

// // // //   preferences: {
// // // //     ageRange: {
// // // //       min: Number,
// // // //       max: Number
// // // //     },
// // // //     distanceRange: Number,
// // // //     genderPreference: [String]
// // // //   },

// // // //   interests: [String],

// // // //   photos: [{
// // // //     url: String,
// // // //     isPrimary: Boolean,
// // // //     order: Number
// // // //   }],

// // // //   location: {
// // // //     type: {
// // // //       type: String,
// // // //       enum: ['Point'],
// // // //       default: 'Point'
// // // //     },
// // // //     coordinates: {
// // // //       type: [Number], // [long, lat]
// // // //       default: [0, 0]
// // // //     }
// // // //   },

// // // //   isProfileCompleted: { type: Boolean, default: false },
// // // //   isOnboardingCompleted: { type: Boolean, default: false },
// // // //   isKycVerified: { type: Boolean, default: false },
// // // //   isDiscoverable: { type: Boolean, default: true },

// // // //   profileCompletedAt: Date,
// // // //   onboardingStartedAt: Date,
// // // //   onboardingCompletedAt: Date

// // // // }, { timestamps: true });

// // // // ProfileSchema.index({ location: '2dsphere' });




// // // // src/modules/profile/profile.model.js
// // // const mongoose = require('mongoose');

// // // const PhotoSchema = new mongoose.Schema({
// // //   url: { type: String, required: true },
// // //   isPrimary: { type: Boolean, default: false },
// // //   order: { type: Number, default: 0 },
// // //   uploadedAt: { type: Date, default: Date.now }
// // // }, { _id: false });

// // // const ProfileSchema = new mongoose.Schema({
// // //   userId: {
// // //     type: mongoose.Schema.Types.ObjectId,
// // //     ref: 'User',  
// // //     required: true,
// // //     index: true
// // //   },

// // //   nickname: { type: String },
// // //   fullName: { type: String },
// // //   bio: { type: String, maxlength: 300 },

// // //   dob: { type: Date },
// // //   gender: { type: String, enum: ['male', 'female', 'other'] },

// // //   interests: [{ type: String }], // tags / hobbies

// // //   preferences: {
// // //     ageRange: {
// // //       min: { type: Number, default: 18 },
// // //       max: { type: Number, default: 60 }
// // //     },
// // //     distanceRange: { type: Number, default: 50 }, // kilometers
// // //     genderPreference: [{ type: String }]
// // //   },

// // //   photos: [PhotoSchema],

// // //   location: {
// // //     type: {
// // //       type: String,
// // //       enum: ['Point'],
// // //       default: 'Point'
// // //     },
// // //     coordinates: {
// // //       type: [Number], // [lon, lat]
// // //       default: [0, 0]
// // //     },
// // //     city: { type: String },
// // //     country: { type: String }
// // //   },

// // //   isProfileCompleted: { type: Boolean, default: false },
// // //   isOnboardingCompleted: { type: Boolean, default: false },
// // //   isKycVerified: { type: Boolean, default: false },
// // //   isDiscoverable: { type: Boolean, default: true },

// // //   profileCompletedAt: Date,
// // //   onboardingStartedAt: Date,
// // //   onboardingCompletedAt: Date

// // // }, { timestamps: true });

// // // // Create geospatial index for proximity queries
// // // ProfileSchema.index({ 'location': '2dsphere' });
// // // module.exports = mongoose.model('Profile', ProfileSchema);



// // const mongoose = require("mongoose");

// // const PhotoSchema = new mongoose.Schema({
// //   url: { type: String, required: true },
// //   publicId: { type: String, required: true }, 
// //   isPrimary: { type: Boolean, default: false },
// //   order: { type: Number, default: 0 },
// //   width: { type: Number },
// //   height: { type: Number },
// //   format: { type: String },
// //   bytes: { type: Number },
// //   uploadedAt: { type: Date, default: Date.now }
// // }, { _id: false });

// // const ProfileSchema = new mongoose.Schema({
// //   userId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "User",
// //     required: true,
// //     unique: true,
// //     index: true
// //   },

// //   // BASIC INFO
// //   fullName: { type: String, trim: true },
// //   nickname: { type: String, trim: true },
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
// //       enum: ["Point"],
// //       default: "Point"
// //     },
// //     coordinates: {
// //       type: [Number], // [long, lat]
// //       default: [0, 0],
// //       index: "2dsphere"
// //     },
// //     city: String,
// //     country: String
// //   },
// //   onboardingProgress: {
// //   phoneVerified: { type: Boolean, default: false },
// //   emailVerified: { type: Boolean, default: false },
// //   basicInfo: { type: Boolean, default: false },   // dob, gender
// //   updateLocation: { type: Boolean, default: false },
// //   interestsSelected: { type: Boolean, default: false },
// //   photosUploaded: { type: Boolean, default: false },
// //   kycVerified: { type: Boolean, default: false },
// //   preferencesSet: { type: Boolean, default: false },
// // },

// //   isProfileCompleted: { type: Boolean, default: false },
// //   isOnboardingCompleted: { type: Boolean, default: false },
// //   isKycVerified: { type: Boolean, default: false },
// //   isDiscoverable: { type: Boolean, default: true },

// //   profileCompletedAt: Date,
// //   onboardingStartedAt: Date,
// //   onboardingCompletedAt: Date
// // }, { timestamps: true });

// // // SPEED BOOST: compound index for swipe/search
// // ProfileSchema.index({ isDiscoverable: 1, gender: 1 });
// // ProfileSchema.index({ "location.coordinates": "2dsphere" });
// // module.exports = mongoose.model("Profile", ProfileSchema);





// // profile.model.js (Modified)

// const mongoose = require('mongoose');

// const ProfileSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     unique: true,
//     index: true
//   },

//   // ========================================
//   // TIER 1: MANDATORY FIELDS (60%)
//   // ========================================
  
//   // Basic Info (20%)
//   fullName: { type: String, trim: true },
//   nickname: { type: String, trim: true, index: true },
//   dob: { type: Date },
//   age: { type: Number }, // Auto-calculated
//   gender: {
//     type: String,
//     enum: ["male", "female", "non-binary", "trans-man", "trans-women", "genderqueer", "everyone", "other"]
//   },

//   // Relationship Goals (5%)
//   // relationshipGoal: [{
//   //   type: String,
//   //   enum: ["dating", "friendship", "casual", "serious", "networking", "open_to_options"]
//   // }],

//  relationshipGoal: {
//   key: {
//     type: String,
//     enum: [
//       "dating",
//       "friendship",
//       "casual",
//       "serious",
//       "networking",
//       "open_to_options"
//     ],
//     // required: true
//   },
//   title: {
//     type: String,
//     // required: true
//   },
//   subtitle: {
//     type: String,
//     // required: true
//   }
// },

//   // Preferences (15%)
//   // preferences: {
//   //   ageRange: {
//   //     min: { type: Number, default: 18, min: 18 },
//   //     max: { type: Number, default: 60, max: 100 }
//   //   },
//   //   distanceRange: { type: Number, default: 50, min: 1, max: 500 },
//   //   genderPreference: [{
//   //     type: String,
//   //     enum: ["male", "female", "non-binary", "trans-man", "trans-women", "everyone", "other"]
//   //   }]
//   // },
// discovery: {
//    distanceRange: { type: Number, default: 50, min: 1, max: 500 },
//    ageRange: {
//       min: { type: Number, default: 18, min: 18 },
//       max: { type: Number, default: 60, max: 100 }
//     },
//   showMeGender: [String],        // IDs
//   relationshipGoal: {
//   key: {
//     type: String,
//     enum: [
//       "dating",
//       "friendship",
//       "casual",
//       "serious",
//       "networking",
//       "open_to_options"
//     ],
//     // required: true
//   },
//   title: {
//     type: String,
//     // required: true
//   },
//   subtitle: {
//     type: String,
//     // required: true
//   }
// },
//   globalVisibility: String       // everyone | matches_only
// },


//   // Interests (5%)
//   interests: [{ type: String }], // Min 3, Max 15

//   // Photos (10%)
//   // photos: [{
//   //   url: { type: String, sparse: true },
//   //   publicId: String,
//   //   isPrimary: Boolean,
//   //   order: Number,
//   //   uploadedAt: Date
//   // }],


//    attributes: {
//     // Basics
//     zodiac: { type: String, default: null },
//     education: { type: String, default: null },
//     familyPlans: { type: String, default: null },
//     personalityType: { type: String, default: null },
//     communicationStyle: { type: String, default: null },
//     loveStyle: { type: String, default: null },
    
//     // Lifestyle
//     pets: { type: String, default: null },
//     drinking: { type: String, default: null },
//     smoking: { type: String, default: null },
//     workout: { type: String, default: null },
//     dietary: { type: String, default: null },
//     sleeping: { type: String, default: null },
//     socialMedia: { type: String, default: null },
    
//     // Arrays
//     languages: { type: [String], default: [] },
//     interests: { type: [String], default: [] },
//     music: { type: [String], default: [] },
//     movies: { type: [String], default: [] },
//     books: { type: [String], default: [] },
//     travel: { type: [String], default: [] },
//     religion: { type: String, default: null }
//   },





//   photos: {
//   type: [{
//     url: { type: String, sparse: true },
//     publicId: String,
//     isPrimary: Boolean,
//     order: Number,
//     uploadedAt: Date
//   }],
//   default: []
// },
//   location: {
//   type: { 
//     type: String, 
//     enum: ["Point"], 
//     default: "Point" 
//   },
//   coordinates: { 
//     type: [Number], 
//     default: [0, 0],  // This ensures new profiles get default coordinates
//     validate: {
//       validator: function(v) {
//         return Array.isArray(v) && 
//                v.length === 2 && 
//                typeof v[0] === 'number' && 
//                typeof v[1] === 'number';
//       },
//       message: 'Coordinates must be an array of two numbers [longitude, latitude]'
//     }
//   },
//   city: String,
//   state: String,
//   country: String
//   },


//   // ========================================
//   // TIER 2: OPTIONAL FIELDS (40%)
//   // ========================================
  
//   bio: { type: String, maxlength: 500 }, // 5%

// lifestyle: {
//   // Pets
//   pets: {
//     type: String,
//     enum: ['None', 'Dog', 'Cat', 'Fish', 'Bird', 'Rabbit', 'Hamster', 'Reptile', 'Exotic Pet', 'Other']
//   },
  
//   // Drinking Habits
//   drinkingHabit: {
//     type: String,
//     enum: ['Social Drinker', 'Occasional Drinker', 'Non-Drinker', 'Wine Enthusiast', 
//            'Craft Beer Lover', 'Cocktail Connoisseur']
//   },
  
//   // Smoking Habits
//   smokingHabit: {
//     type: String,
//     enum: ['Smoker', 'Non-Smoker', 'Quitter', 'Occasional Smoker', 'Vape Enthusiast']
//   },
  
//   // Workout
//   workoutFrequency: {
//     type: String,
//     enum: ['Everyday', 'Often', 'Sometimes', 'Never']
//   },
  
//   // Dietary Preferences
//   dietaryPreference: {
//     type: [String],
//     enum: ['Vegetarian', 'Vegan', 'Omnivore', 'Pescatarian', 'Halal', 
//            'Gluten-Free', 'Dairy-Free', 'Plant-Based', 'Keto', 'Raw Food', 
//            'Kosher', 'Other']
//   },
  
//   // Social Media Presence
//   socialMediaPresence: {
//     type: String,
//     enum: ['Active on All', 'Active on Some', 'Minimal Social Media Presence', 
//            'Social Media Influencer']
//   },
  
//   // Sleeping Habits
//   sleepingHabit: {
//     type: String,
//     enum: ['Early Bird', 'Night Owl', 'Regular Sleeper', 'Insomniac']
//   }
// },

//   basics : {
//     education: {
//       enum: ["high_school", "bachelors", "masters", "phd", "trade_school", "prefer_not_to_say"],
//       type : String
//   },
//     zodiac: {
//       type: String,
//       enum: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
//     },
//     familyPlans : {
//       type : String,
//     },
//     PersonalityType : {
//       type: String,
//       enum: ["intj", "entj", "entp","istp","isfp"]
//     },
//     communicationStyle: {
//       type: String,
//       enum: ["chattyCathy", "listener", "joker", "deepThinker", "sarcasticWit","easyGoing","storyTeller","straightShooter"]
//     },
//     loveStyle : {
//       type : String,
//       enum : ["hopelessRomantic","bestFriend","adventureSeeker","careGiver"]
//     } 
//   },

//   // Languages (5%)
//   languages: [{ type: String }], // e.g., ["English", "Hindi", "Spanish"]

//   religion : {
//     type : String
//   },

  
//   musicPreference: [{
//     type: String,
//     enum: ["pop", "rock", "hip_hop", "classical", "jazz", "country", "electronic", "indie", "r&b", "folk", "metal", "other"]
//   }],

    
//   moviePreference: [{
//     type: String,
//     enum: ["action", "comedy", "drama", "horror", "romance", "sci_fi", "thriller", "animated", "documentary", "other"]
//   }],

//   bookPreference: [{
//     type: String,
//     enum: ["fiction", "non_fiction", "mystery", "romance", "sci_fi", "fantasy", "biography", "self_help", "poetry", "other"]
//   }],

//   travelPreference: {
//     type: String,
//     enum: ["adventure", "relaxation", "cultural", "budget", "luxury", "road_trips", "international", "domestic"]
//   },

//   height: {
//     type: String,
//     default: null  // Use null instead of empty string
//   },
//   jobtitle: {
//     type: String,
//     default: null
//   },
//   occupation: {
//     type: String,
//     default: null
//   },
//   about_me: {
//     type: String,
//     default: null
//   },
//   company: {
//     type: String,
//     default: null
//   },
//   school: {
//     type: String,
//     default: null
//   },

//   kyc: {
//     status: {
//       type: String,
//       enum: ["not_started", "pending", "approved", "rejected"],
//       default: "not_started"
//     },
//     selfie: {
//       url: String,
//       publicId: String,
//       uploadedAt: Date
//     },
//     idDocument: {
//       type: { type: String, enum: ["driving_license", "passport", "proof_of_age"] },
//       frontUrl: String,
//       frontPublicId: String,
//       backUrl: String,
//       backPublicId: String,
//       uploadedAt: Date
//     },
//     submittedAt: Date,
//     reviewedAt: Date,
//     reviewedBy: mongoose.Schema.Types.ObjectId,
//     rejectionReason: String
//   },



//    visibility: {
//     type: String,
//     enum: ["everyone", "matches_only", "nobody"],
//     default: "everyone"
//   },
//   //  globalVisibility: {
//   //   type: String,
//   //   enum: ["everyone", "matches_only"],
//   //   default: "everyone"
//   // },
  


//   // ========================================
//   // PROGRESS TRACKING (Auto-calculated)
//   // ========================================
//   onboardingProgress: {
//     // Tier 1 (Mandatory)
//     phoneVerified: { type: Boolean, default: false },
//     emailVerified: { type: Boolean, default: false },
//     nicknameSet: { type: Boolean, default: false },
//     dobSet: { type: Boolean, default: false },
//     genderSet: { type: Boolean, default: false },
//     relationshipGoalSet: { type: Boolean, default: false },
//     genderPreferenceSet: { type: Boolean, default: false },
//     ageRangeSet: { type: Boolean, default: false },
//     distanceRangeSet: { type: Boolean, default: false },
//     interestsSet: { type: Boolean, default: false },
//     photosUploaded: { type: Boolean, default: false },
//     selfieUploaded: { type: Boolean, default: false },
//     idDocumentUploaded: { type: Boolean, default: false },
//     locationSet: { type: Boolean, default: false },
    
//     // Tier 2 (Optional)
//     bioSet: { type: Boolean, default: false },
//     lifestyleSet: { type: Boolean, default: false },
//     languagesSet: { type: Boolean, default: false },
//     educationSet: { type: Boolean, default: false },
//     communicationStyleSet: { type: Boolean, default: false },
//     musicPreferenceSet: { type: Boolean, default: false },
//     bookPreferenceSet: { type: Boolean, default: false },
//     travelPreferenceSet: { type: Boolean, default: false },
    
//     // Calculated
//     mandatoryCompletion: { type: Number, default: 0 }, // 0-60
//     optionalCompletion: { type: Number, default: 0 },  // 0-40
//     totalCompletion: { type: Number, default: 0 },     // 0-100
//     currentStep: String,
//     lastCompletedStep: String
//   },

//   // ========================================
//   // STATUS FLAGS
//   // ========================================
//   isMandatoryComplete: { type: Boolean, default: false }, // 60% done
//   isProfileComplete: { type: Boolean, default: false },    // 100% done
//   canAccessSwipe: { type: Boolean, default: false },
//   isDiscoverable: { type: Boolean, default: false },

//   // Timestamps
//   lastProfileUpdate: Date

// }, { timestamps: true });




// // ========================================
// // METHODS (Auto-calculate everything)
// // ========================================

// ProfileSchema.methods.calculateCompletion = function() {
//   const progress = this.onboardingProgress;
  
//   // Tier 1 weights (must sum to 60)
//   const TIER1_WEIGHTS = {
//     phoneVerified: 5,
//     emailVerified: 5,
//     nicknameSet: 5,
//     dobSet: 5,
//     genderSet: 5,
//     relationshipGoalSet: 5,
//     genderPreferenceSet: 5,
//     ageRangeSet: 5,
//     distanceRangeSet: 5,
//     interestsSet: 5,
//     photosUploaded: 10,
//     selfieUploaded: 5,
//     idDocumentUploaded: 5
//     // locationSet: 0 (optional, doesn't block)
//   };
  
//   // Tier 2 weights (must sum to 40)
//   const TIER2_WEIGHTS = {
//     bioSet: 5,
//     lifestyleSet: 8,
//     languagesSet: 5,
//     educationSet: 5,
//     communicationStyleSet: 3,
//     musicPreferenceSet: 4,
//     bookPreferenceSet: 3,
//     travelPreferenceSet: 4,
//     // Extra photos covered in photosUploaded
//   };
  
//   // Calculate Tier 1 (Mandatory)
//   let tier1Total = 0;
//   for (const [key, weight] of Object.entries(TIER1_WEIGHTS)) {
//     if (progress[key]) tier1Total += weight;
//   }
  
//   // Calculate Tier 2 (Optional)
//   let tier2Total = 0;
//   for (const [key, weight] of Object.entries(TIER2_WEIGHTS)) {
//     if (progress[key]) tier2Total += weight;
//   }
  
//   // Update progress
//   this.onboardingProgress.mandatoryCompletion = tier1Total;
//   this.onboardingProgress.optionalCompletion = tier2Total;
//   this.onboardingProgress.totalCompletion = tier1Total + tier2Total;
  
//   // Check mandatory complete (60%)
//   this.isMandatoryComplete = (tier1Total >= 60);
  
//   // Check full complete (100%)
//   this.isProfileComplete = (tier1Total + tier2Total >= 100);
  
//   return {
//     mandatory: tier1Total,
//     optional: tier2Total,
//     total: tier1Total + tier2Total
//   };
// };

// ProfileSchema.methods.getNextStep = function() {
//   const progress = this.onboardingProgress;
  
//   // Define strict orderscreen
//   const MANDATORY_STEPS = [
//     { key: "phoneVerified", screen: "phone_verification", message: "Verify phone" },
//     { key: "emailVerified", screen: "email_verification", message: "Verify email" },
//     { key: "nicknameSet", screen: "nickname", message: "Choose nickname" },
//     { key: "dobSet", screen: "birthdate", message: "Enter birthdate" },
//     { key: "genderSet", screen: "gender", message: "Select gender" },
//     { key: "relationshipGoalSet", screen: "relationship_goals", message: "What are you looking for?" },
//     { key: "genderPreferenceSet", screen: "gender_preference", message: "Who do you want to meet?" },
//     { key: "ageRangeSet", screen: "age_range", message: "Set age range" },
//     { key: "distanceRangeSet", screen: "distance_range", message: "Set distance" },
//     { key: "interestsSet", screen: "interests", message: "Choose interests" },
//     { key: "photosUploaded", screen: "photos", message: "Add photos" },
//     { key: "selfieUploaded", screen: "selfie", message: "Selfie verification" },
//     { key: "idDocumentUploaded", screen: "id_document", message: "Upload ID" },
//     { key: "locationSet", screen: "location", message: "Enable location" }
//   ];
  
//   // Find first incomplete mandatory step
//   for (const step of MANDATORY_STEPS) {
//     if (!progress[step.key]) {
//       return { screen: step.screen, message: step.message, tier: "mandatory" };
//     }
//   }
  
//   // All mandatory done - check KYC
//   if (this.kyc.status === "pending") {
//     return { screen: "kyc_pending", message: "Verification in review", tier: "kyc" };
//   }
  
//   if (this.kyc.status === "rejected") {
//     return { screen: "kyc_rejected", message: "Verification rejected", tier: "kyc" };
//   }
  
//   if (this.kyc.status === "approved" && this.isMandatoryComplete) {
//     // User can access swipe, but suggest optional fields
//     const OPTIONAL_STEPS = [
//       { key: "bioSet", screen: "bio", message: "Add bio" },
//       { key: "lifestyleSet", screen: "lifestyle", message: "Share lifestyle" },
//       { key: "languagesSet", screen: "languages", message: "Languages you know" },
//       { key: "educationSet", screen: "education", message: "Education" },
//       { key: "communicationStyleSet", screen: "communication", message: "Communication style" },
//       { key: "musicPreferenceSet", screen: "music", message: "Music preference" },
//       { key: "bookPreferenceSet", screen: "books", message: "Book preference" },
//       { key: "travelPreferenceSet", screen: "travel", message: "Travel style" }
//     ];
    
//     // Find first incomplete optional step
//     for (const step of OPTIONAL_STEPS) {
//       if (!progress[step.key]) {
//         return { 
//           screen: step.screen, 
//           message: step.message, 
//           tier: "optional",
//           canSkip: true // User can skip to home
//         };
//       }
//     }
    
//     // Everything 100% complete!
//     return { screen: "home", message: "Profile complete!", tier: "complete" };
//   }
  
//   return { screen: "kyc_pending", message: "Complete verification", tier: "kyc" };
// };

// // Auto-update on save
// ProfileSchema.pre("save", function(next) {
//   // Calculate age
//   if (this.dob) {
//     const today = new Date();
//     const birth = new Date(this.dob);
//     let age = today.getFullYear() - birth.getFullYear();
//     const m = today.getMonth() - birth.getMonth();
//     if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
//     this.age = age;
//   }
  
//   // Update progress flags
//   this.onboardingProgress.nicknameSet = Boolean(this.nickname);
//   this.onboardingProgress.dobSet = Boolean(this.dob);
//   this.onboardingProgress.genderSet = Boolean(this.gender);
//   // this.onboardingProgress.relationshipGoalSet = this.relationshipGoal?.length > 0;
//   this.onboardingProgress.relationshipGoalSet =
//   Boolean(this.relationshipGoal?.key);
//   this.onboardingProgress.genderPreferenceSet = this.preferences?.genderPreference?.length > 0;
//   this.onboardingProgress.ageRangeSet = Boolean(this.preferences?.ageRange?.min);
//   this.onboardingProgress.distanceRangeSet = Boolean(this.preferences?.distanceRange);
//   this.onboardingProgress.interestsSet = this.interests?.length >= 3;
//   this.onboardingProgress.photosUploaded = this.photos?.length >= 2;
//   this.onboardingProgress.selfieUploaded = Boolean(this.kyc?.selfie?.url);
//   this.onboardingProgress.idDocumentUploaded = Boolean(this.kyc?.idDocument?.frontUrl);
//   this.onboardingProgress.locationSet = Boolean(this.location?.coordinates?.[0]);
  
//   // Tier 2 (Optional)
//   this.onboardingProgress.bioSet = Boolean(this.bio);
//   this.onboardingProgress.lifestyleSet = Boolean(this.lifestyle?.religiousBeliefs || this.lifestyle?.zodiacSign);
//   this.onboardingProgress.languagesSet = this.languages?.length > 0;
//   this.onboardingProgress.educationSet = Boolean(this.education?.level);
//   this.onboardingProgress.communicationStyleSet = Boolean(this.communicationStyle);
//   this.onboardingProgress.musicPreferenceSet = this.musicPreference?.length > 0;
//   this.onboardingProgress.bookPreferenceSet = this.bookPreference?.length > 0;
//   this.onboardingProgress.travelPreferenceSet = Boolean(this.travelPreference);
  
//   // Calculate completion
//   this.calculateCompletion();
  
//   // Enable swipe access
//   this.onboardingProgress.isProfileComplete = this.isProfileComplete;
//   this.onboardingProgress.canAccessSwipe = this.canAccessSwipe;
//   this.canAccessSwipe = this.isMandatoryComplete && this.kyc.status === "approved";
//   this.isDiscoverable = this.canAccessSwipe;

//   // 🔒 If profile is manually hidden (deactivated), do NOT override
// if (this.visibility === "nobody") {
//   this.canAccessSwipe = false;
//   this.isDiscoverable = false;
// } else {
//   this.canAccessSwipe =
//     this.isMandatoryComplete && this.kyc.status === "approved";
//   this.isDiscoverable = this.canAccessSwipe;
// }
//   this.lastProfileUpdate = new Date();
//   next();
// });
// ProfileSchema.index({ location: "2dsphere" });

// module.exports = mongoose.model("Profile", ProfileSchema);

// // Add this before the model is created
// // ProfileSchema.pre('save', function(next) {
// //   if (this.isModified('kyc.status') && this.kyc.status === 'approved') {
// //     this.canAccessSwipe = true;
// //     this.isDiscoverable = true;
// //     this.isProfileComplete = true;
// //     this.isMandatoryComplete = true;
// //   }
// //   next();
// // });  



const mongoose = require('mongoose');

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
    selfieUrl: String,
    docUrl: String,
    rejectionReason: {
      type : String,
      default : null
    }
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