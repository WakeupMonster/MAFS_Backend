// // // src/modules/profile/profile.model.js
// // const mongoose = require('mongoose');
// // const ProfileSchema = new mongoose.Schema({

// //   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserAuth', required: true },

// //   nickname: String,
// //   fullName: String,
// //   bio: { type: String, maxlength: 300 },

// //   dob: Date,
// //   gender: String,
// //   interestedIn: [String],

// //   preferences: {
// //     ageRange: {
// //       min: Number,
// //       max: Number
// //     },
// //     distanceRange: Number,
// //     genderPreference: [String]
// //   },

// //   interests: [String],

// //   photos: [{
// //     url: String,
// //     isPrimary: Boolean,
// //     order: Number
// //   }],

// //   location: {
// //     type: {
// //       type: String,
// //       enum: ['Point'],
// //       default: 'Point'
// //     },
// //     coordinates: {
// //       type: [Number], // [long, lat]
// //       default: [0, 0]
// //     }
// //   },

// //   isProfileCompleted: { type: Boolean, default: false },
// //   isOnboardingCompleted: { type: Boolean, default: false },
// //   isKycVerified: { type: Boolean, default: false },
// //   isDiscoverable: { type: Boolean, default: true },

// //   profileCompletedAt: Date,
// //   onboardingStartedAt: Date,
// //   onboardingCompletedAt: Date

// // }, { timestamps: true });

// // ProfileSchema.index({ location: '2dsphere' });




// // src/modules/profile/profile.model.js
// const mongoose = require('mongoose');

// const PhotoSchema = new mongoose.Schema({
//   url: { type: String, required: true },
//   isPrimary: { type: Boolean, default: false },
//   order: { type: Number, default: 0 },
//   uploadedAt: { type: Date, default: Date.now }
// }, { _id: false });

// const ProfileSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',  
//     required: true,
//     index: true
//   },

//   nickname: { type: String },
//   fullName: { type: String },
//   bio: { type: String, maxlength: 300 },

//   dob: { type: Date },
//   gender: { type: String, enum: ['male', 'female', 'other'] },

//   interests: [{ type: String }], // tags / hobbies

//   preferences: {
//     ageRange: {
//       min: { type: Number, default: 18 },
//       max: { type: Number, default: 60 }
//     },
//     distanceRange: { type: Number, default: 50 }, // kilometers
//     genderPreference: [{ type: String }]
//   },

//   photos: [PhotoSchema],

//   location: {
//     type: {
//       type: String,
//       enum: ['Point'],
//       default: 'Point'
//     },
//     coordinates: {
//       type: [Number], // [lon, lat]
//       default: [0, 0]
//     },
//     city: { type: String },
//     country: { type: String }
//   },

//   isProfileCompleted: { type: Boolean, default: false },
//   isOnboardingCompleted: { type: Boolean, default: false },
//   isKycVerified: { type: Boolean, default: false },
//   isDiscoverable: { type: Boolean, default: true },

//   profileCompletedAt: Date,
//   onboardingStartedAt: Date,
//   onboardingCompletedAt: Date

// }, { timestamps: true });

// // Create geospatial index for proximity queries
// ProfileSchema.index({ 'location': '2dsphere' });

// module.exports = mongoose.model('Profile', ProfileSchema);



const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const ProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  // BASIC INFO
  fullName: { type: String, trim: true },
  nickname: { type: String, trim: true },
  bio: { type: String, maxlength: 300 },

  dob: { type: Date },
  gender: { type: String, enum: ["male", "female", "other"] },

  // INTERESTS
  interests: [{ type: String }],

  // PREFERENCES
  preferences: {
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 60 }
    },
    distanceRange: { type: Number, default: 50 },
    genderPreference: [{ type: String, enum: ["male", "female", "other"] }]
  },

  // PHOTOS
  photos: [PhotoSchema],

  // LOCATION (GEO)
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [long, lat]
      default: [0, 0],
      index: "2dsphere"
    },
    city: String,
    country: String
  },

  isProfileCompleted: { type: Boolean, default: false },
  isOnboardingCompleted: { type: Boolean, default: false },
  isKycVerified: { type: Boolean, default: false },
  isDiscoverable: { type: Boolean, default: true },

  profileCompletedAt: Date,
  onboardingStartedAt: Date,
  onboardingCompletedAt: Date
}, { timestamps: true });

// SPEED BOOST: compound index for swipe/search
ProfileSchema.index({ isDiscoverable: 1, gender: 1 });

module.exports = mongoose.model("Profile", ProfileSchema);