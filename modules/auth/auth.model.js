const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false });

// Social Provider Schema
const socialProviderSchema = new mongoose.Schema({
  id: { type: String, required: true },           // Provider's user ID
  email: { type: String },                        // Email from provider
  name: { type: String },                         // Name from provider
  picture: { type: String },                      // Profile picture URL
  linkedAt: { type: Date, default: Date.now },    // When linked
  lastLoginAt: { type: Date }                     // Last login with this provider
}, { _id: false });

const userSchema = new mongoose.Schema({
  // ============ PHONE AUTHENTICATION ============
  phone: { type: String, unique: true, sparse: true },
   phoneHash: {
    type: String,
    index: true
  },     
  isPhoneVerified: { type: Boolean, default: false },
  phoneOtp: { type: String },
  phoneOtpExpires: { type: Date },

  // ============ EMAIL AUTHENTICATION ============
  email: { type: String, unique: true, sparse: true },
  isEmailVerified: { type: Boolean, default: false },
  emailOtp: { type: String },
  emailOtpExpires: { type: Date },

  // ============ SOCIAL AUTHENTICATION ============
  social: {
    google: socialProviderSchema,
    facebook: socialProviderSchema,
    apple: socialProviderSchema
  },

  // ============ TOKENS & SESSIONS ============
  // fcmTokens: [{
  //   token: String,
  //   deviceId: String,
  //   createdAt: { type: Date, default: Date.now }
  // }],

  refreshTokens: [refreshTokenSchema],

  // ============ NOTIFICATION SETTINGS ============
  // notificationSettings: {
  //   likes: { type: Boolean, default: true },
  //   messages: { type: Boolean, default: true },
  //   matches: { type: Boolean, default: true }
  // },

//   notificationSettings: {
//   push: { type: Boolean, default: true },
//   email: { type: Boolean, default: false },
//   matches: { type: Boolean, default: true },
//   messages: { type: Boolean, default: true }
// },


  // ============ STATUS FLAGS ============
  isNewUser: { type: Boolean, default: true, index: true },
  isProfileCompleted: { type: Boolean, default: false },

  role: {
  type: String,
  enum: ["USER", "ADMIN"],
  default: "USER",
  index: true
},



  accountStatus: {
  type: String,
  enum: ["active", "deactivated", "married", "deleted","banned"],
  default: "active",
  index: true
},

  banDetails: {
  isBanned: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    default: null
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null
  },
  bannedAt: {
    type: Date,
    default: null
  }
},

deactivationDetails: {
  isDeactivated: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    default: null
  },
  deactivatedAt: {
    type: Date,
    default: null
  }
},

deletionDetails: {
  isScheduledForDeletion: {
    type: Boolean,
    default: false
  },
  scheduledAt: {
    type: Date,
    default: null
  }
},

onboarding: {
  isComplete: {
    type: Boolean,
    default: false
  },
  // nextstep: {
  //   type: Number,
  //   default: 7
  // },
  currentScreenSlug: {
    type: String,
    default: ""
  }
},


isPremium: {
  type: Boolean,
  default: false
},

premiumExpiresAt: {
  type: Date,
  default: null
},



authMethod: {
    type: String,
    enum: ["phone", "email", "google", "facebook", "apple"],
    default: "phone"
  }
}, { timestamps: true });




// ============ INDEXES ============
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ "social.google.id": 1 });
userSchema.index({ "social.facebook.id": 1 });
userSchema.index({ "social.apple.id": 1 });
userSchema.index({ isPhoneVerified: 1 });
userSchema.index({ isEmailVerified: 1 });
refreshTokenSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("User", userSchema);