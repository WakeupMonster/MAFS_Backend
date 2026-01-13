const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

// Social Provider Schema
const socialProviderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // Provider's user ID
    email: { type: String }, // Email from provider
    name: { type: String }, // Name from provider
    picture: { type: String }, // Profile picture URL
    linkedAt: { type: Date, default: Date.now }, // When linked
    lastLoginAt: { type: Date }, // Last login with this provider
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // ============ PHONE AUTHENTICATION ============
    phone: { type: String, unique: true, sparse: true },
    phoneHash: {
      type: String,
      index: true,
    },
    isPhoneVerified: { type: Boolean, default: false },
    phoneOtp: { type: String },
    phoneOtpExpires: { type: Date },

    // ============ EMAIL AUTHENTICATION ============
    email: { type: String, unique: true, sparse: true },
    isEmailVerified: { type: Boolean, default: false },
    emailOtp: { type: String },
    emailOtpExpires: { type: Date },

    // This password field for Admin only
    password: { type: String },

    // This forgot Password is for Admin only
    forgotPassword: {
      otpHash: String,
      expiresAt: Number,
      verified: { type: Boolean, default: false },
    },

    // ============ SOCIAL AUTHENTICATION ============
    social: {
      google: socialProviderSchema,
      facebook: socialProviderSchema,
      apple: socialProviderSchema,
    },

    refreshTokens: [refreshTokenSchema],

  banDetails: {
  isBanned: {
    type: Boolean,
    default: false,
    index : true
  },
  reason: {
    type: String,
    default: null
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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

suspensionDetails: {
  isSuspended: {
    type: Boolean,
    default: false,
    index: true
  },

  reason: {
    type: String,
    default: null
  },

  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // admin
    default: null
  },

  suspendedAt: {
    type: Date,
    default: null
  },

  suspendUntil: {
    type: Date,
    default: null,
    index: true
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

lastLoginAt: {
  type: Date,
  default: null,
  index: true
},


authMethod: {
    type: String,
    enum: ["phone", "email", "google", "facebook", "apple"],
    default: "phone"
  }
}, { timestamps: true });

userSchema.index({ "social.google.id": 1 });
userSchema.index({ "social.facebook.id": 1 });
userSchema.index({ "social.apple.id": 1 });
userSchema.index({ isPhoneVerified: 1 });
userSchema.index({ isEmailVerified: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
// Active premium users
userSchema.index({ isPremium: 1 });
userSchema.index({ premiumExpiresAt: 1 });
userSchema.index({ "deactivationDetails.isDeactivated": 1 });
userSchema.index({ "deletionDetails.isScheduledForDeletion": 1 });

module.exports = mongoose.model("User", userSchema);
