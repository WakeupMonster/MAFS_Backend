const mongoose = require("mongoose");

// --- REFRESH TOKEN SCHEMA (Existing) ---
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

// --- SOCIAL PROVIDER SCHEMA (Existing) ---
const socialProviderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // Provider's user ID
    email: { type: String }, // Email from provider
    name: { type: String }, // Name from provider
    picture: { type: String }, // Profile picture URL
    linkedAt: { type: Date, default: Date.now }, // When linked
    lastLoginAt: { type: Date }, // Last login with this provider
  },
  { _id: false },
);

// --- NEW: SESSION & DEVICE SCHEMA ---
// Define the Session Schema for detailed history & "Manage Devices".
const sessionSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true }, // Unique ID from Frontend
    deviceName: { type: String }, // e.g., "iPhone 13", "Pixel 7"
    os: { type: String }, // e.g., "iOS 17.2", "Android 14"
    platform: { type: String, enum: ["ios", "android", "web"] },
    lastIp: { type: String },
    lastUsedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const userSchema = new mongoose.Schema(
  {
    // ============ PHONE AUTHENTICATION ============
    phone: { type: String, unique: true, sparse: true },
    phoneHash: { type: String, index: true },
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
      apple: socialProviderSchema,
    },

    // ============ NEW: IP & DEVICE TRACKING ============
    currentIp: { type: String }, // Current/Last IP address
    lastUsedDevice: { type: String }, // Last device name used

    // Active Sessions (Multiple devices)
    sessions: [sessionSchema],

    // Login History (Audit Trail)
    // Isko 'select: false' rakha hai taaki hamesha load na ho (performance)
    loginHistory: {
      type: [
        {
          ip: String,
          device: String,
          timestamp: { type: Date, default: Date.now },
          authMethod: String,
          status: {
            type: String,
            enum: ["success", "failed"],
            default: "success",
          },
        },
      ],
      select: false,
    },

    // ============ TOKENS & SESSIONS ============
    fcmTokens: [
      {
        token: String,
        deviceId: String,
        platform: { type: String, enum: ["ios", "android"] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    refreshTokens: [refreshTokenSchema],

    // ============ NOTIFICATION SETTINGS ============
    notificationSettings: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      likes: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      matches: { type: Boolean, default: true },
    },

    // ============ STATUS FLAGS ============

    isNewUser: { type: Boolean, default: true, index: true },
    isProfileCompleted: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      index: true,
    },

    accountStatus: {
      type: String,
      enum: [
        "active",
        "deactivated",
        "married",
        "deleted",
        "banned",
        "suspended",
      ],
      default: "active",
      index: true,
    },

    isFake: { type: Boolean, default: false, index: true },
    fakeProfileMeta: {
      createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      batchId: { type: String, index: true },
    },

    banDetails: {
      isBanned: { type: Boolean, default: false, index: true },
      reason: { type: String, default: null },
      bannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      bannedAt: { type: Date, default: null },
    },

    deactivationDetails: {
      isDeactivated: { type: Boolean, default: false },
      reason: { type: String, default: null },
      deactivatedAt: { type: Date, default: null },
    },

    deletionDetails: {
      isScheduledForDeletion: { type: Boolean, default: false },
      reason: { type: String, default: null },
      scheduledAt: { type: Date, default: null },
      deletionDate: { type: Date, default: null },
      daysRemaining: { type: Number, default: null },
    },

    deleteAccountOtp: { type: String, default: null, select: false },
    deleteAccountOtpExpires: { type: Date, default: null, select: false },

    suspensionDetails: {
      isSuspended: { type: Boolean, default: false, index: true },
      reason: { type: String, default: null },
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      suspendedAt: { type: Date, default: null },
      suspendUntil: { type: Date, default: null, index: true },
    },

    auditLogs: [
      {
        action: {
          type: String,
          enum: [
            "ban",
            "suspend",
            "warn",
            "resolve",
            "approve",
            "re-approve",
            "reject",
            "unban",
            "unsuspend",
            "note",
            "update_profile",
            "view_profile",
            "verification_submit",
            "purchase",
            "deactivate",
            "reactivate",
            "delete",
            "delete_photo",
            "reply",
            "banned",
            "suspended",
            "deactivated",
            "deleted",
            "email_verified",
            "settings_update",
            "married",
          ],
          required: true,
        },
        reason: { type: String },
        actedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actedAt: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed },
      },
    ],

    onboarding: {
      isComplete: { type: Boolean, default: false },
      // nextstep: {
      //   type: Number,
      //   default: 7
      // },
      currentScreenSlug: { type: String, default: "" },
    },

    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null, index: true },

    // ➕ Initiative 3: First 1000 Users Milestone
    registrationRank: { type: Number, index: true },
    giveaway: {
      isEligibleForFreeTrial: { type: Boolean, default: false },
      freeTrialDurationDays: { type: Number, default: 30 },
      description: { type: String, default: "First 1000 users milestone" },
      claimedAt: { type: Date, default: null },
      offerExpiresAt: { type: Date, default: null },
    },

    // ============ PASSWORD (ADMIN ONLY) ============
    password: { type: String, select: false, minlength: 8 },
    passwordChangedAt: { type: Date },
    lastPasswordResetAt: { type: Date },

    authMethod: {
      type: String,
      enum: ["phone", "email", "google", "facebook", "apple", "password"],
      default: "phone",
    },
    isTest: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// --- INDEXES ---
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

// NEW INDEXES for Security
userSchema.index({ "sessions.deviceId": 1 });
userSchema.index({ currentIp: 1 });

module.exports = mongoose.model("User", userSchema);
