const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },     
  isPhoneVerified: { type: Boolean, default: false },

  email: { type: String, unique: true, sparse: true },
  isEmailVerified: { type: Boolean, default: false },

  // OTP hashes (never store raw OTP)
  // phoneOtpHash: { type: String },
  phoneOtp: { type: String },
  phoneOtpExpires: { type: Date },

  // emailOtpHash: { type: String },
  emailOtp: { type: String },
  emailOtpExpires: { type: Date },

//   social: {
//   provider: { type: String }, 
//   providerId: { type: String }
// },
  // tokens for refresh (store hashes)

   fcmTokens: [{
    token: String,
    deviceId: String,
    createdAt: { type: Date, default: Date.now }
  }],
  notificationSettings: {
    likes: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    matches: { type: Boolean, default: true },
    // Add more notification types as needed
  },

  refreshTokens: [refreshTokenSchema],


  // add to your auth.model.js user schema
// keep any existing isProfileCompleted on UserAuth (mirror to profile doc if you need)

  // profile completion flag (profile fields live in profile module)
  isProfileCompleted: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.index({ phone: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
userSchema.index({ isPhoneVerified: 1 });
userSchema.index({ isEmailVerified: 1 });


module.exports = mongoose.model("User", userSchema);