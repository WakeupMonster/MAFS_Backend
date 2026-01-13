const { smsQueue } = require("../../common/queues");
const redis = require("../../common/redis");
const profileModel = require("../profile/profile.model");
const User = require("./auth.model");
const utils = require("./auth.utils");
const { formatUserProfile } = require("./auth.formatter");
const BlockedContact = require("../BlockedContact/blockedContacts.model");
const Block = require("../profile/user.block");
const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");
const UserSubscription = require("../auth/UserSubscription.model");

// const PHONE_OTP_TTL_MS = Number(1000 * 60 * 5); // 5 min
const EMAIL_OTP_TTL_MS = Number(1000 * 60 * 10); // 10 min
const REFRESH_TOKEN_TTL_MS = Number(7 * 24 * 60 * 60 * 1000); // 7 days

const OTP_TTL = 300; // 5 minutes
const RATE_LIMIT_MAX = 2; // max OTP requests allowed
const RATE_LIMIT_WINDOW = 60; // per 60 seconds

async function sendPhoneOtp(phone) {
  const normalizedPhone = phone.trim();
  console.log("📲 Saving OTP for:", normalizedPhone);

  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) user = await User.create({ phone: normalizedPhone });

  const otp = utils.generateOtp();

  const redisKey = `login:${normalizedPhone}`; // ✅ exact same key format
  console.log("🔑 OTP saved in Redis Key:", redisKey);

  await redis.set(redisKey, otp, "EX", 300);

  await utils.sendSms(normalizedPhone, `Your MAFS OTP is ${otp}`);

  // Save device + fcm if new login attempt
  // user.devices.push({ deviceId, deviceType, fcmToken });
  await user.save();

  return { ok: true };
}

// async function sendPhoneOtp(phone) {
//   // find or create user row (we create user when phone first used)
//   let user = await User.findOne({ phone });
//   if (!user) {
//     user = await User.create({ phone });
//   }
//   const otp = utils.generateOtp();
//   // const otpHash = await utils.hashOtp(otp);
//   user.phoneOtp = otp;
//   user.phoneOtpExpires = Date.now() + PHONE_OTP_TTL_MS;
//   await user.save();
//   // send SMS (Twilio)
//   const message = `Your verification code is ${otp}`;
//   await utils.sendSms(phone, message);
//   return { ok: true };
// }

// async function verifyPhoneOtpUnified(phone, otp) {
//   const redisKey = `login:${phone}`;
//   const storedOtp = await redis.get(redisKey);

//   if (!storedOtp) throw new Error("OTP expired or not found");
//   if (storedOtp !== otp) throw new Error("Invalid OTP");

//   // ✅ Find user or create user automatically
//   let user = await User.findOne({ phone });
//   const isNewUser = !user;
//   if (!user) {
//     user = await User.create({ phone });
//   }

//   user.isPhoneVerified = true; // phone verified in both case

//   // // ✅ Device save karo if provided
//   // if (deviceId) {
//   //   user.devices = user.devices || [];
//   //   user.devices.push({ deviceId, deviceType, fcmToken });
//   // }

//   // ✅ Tokens generate karo
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshHash = utils.hashToken(refreshTokenRaw);

//   user.refreshTokens.push({
//     tokenHash: refreshHash,
//     expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
//   });

//   await user.save();
//   await profileModel.findOneAndUpdate(
//     { userId: user._id },
//     {
//       $set: {
//         "onboardingProgress.phoneVerified": true,
//       },
//     },
//     { upsert: true }
//   );

//   await redis.del(redisKey); // OTP delete after verify

//   return {
//     userId: user._id,
//     accessToken,
//     refreshToken: refreshTokenRaw,
//     isNewUser: isNewUser,
//     isPhoneVerified: true,
//     isEmailVerified: user.isEmailVerified,
//     nextStep: getNextStep(user),
//     hasCompletedProfile: user.isProfileCompleted,
//   };
// }

// async function verifyPhoneOtpUnified(phone, otp) {
//   const redisKey = `login:${phone}`;
//   const storedOtp = await redis.get(redisKey);

//   if (!storedOtp) throw new Error("OTP expired or not found");
//   if (storedOtp !== otp) throw new Error("Invalid OTP");

//   let user = await User.findOne({ phone });

//   if (!user) {
//     user = await User.create({ phone });
//   }

//   // ✅ Mark phone verified
//   user.isPhoneVerified = true;

//   // ✅ Generate tokens
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshHash = utils.hashToken(refreshTokenRaw);

//   user.refreshTokens.push({
//     tokenHash: refreshHash,
//     expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
//   });

//   await user.save();

//   // ✅ Update profile onboarding
//   await profileModel.findOneAndUpdate(
//     { userId: user._id },
//     { $set: { "onboardingProgress.phoneVerified": true } },
//     { upsert: true }
//   );

//   await redis.del(redisKey);

//   // ✅ IMPORTANT: Manager required fields here
//   return {
//       id: user._id,
//     accessToken,
//     refreshToken: refreshTokenRaw,
//       phone: user.phone,
//       email : user.email || "",
//       accountStatus: user.accountStatus,
//       isPhoneVerified: user.isPhoneVerified,
//       isEmailVerified: user.isEmailVerified,
//       isPremium: user.isPremium,
//       premiumExpiresAt: user.premiumExpiresAt,
//       banDetails: user.banDetails,
//       deactivationDetails: user.deactivationDetails,
//       deletionDetails: user.deletionDetails,
//       onboarding: getNextStep(user)
//       // nextStep: getNextStep(user)
//   };
// }

// async function verifyPhoneOtpUnified(phone, otp) {
//   const redisKey = `login:${phone}`;
//   const storedOtp = await redis.get(redisKey);

//   if (!storedOtp) throw new Error("OTP expired or not found");
//   if (storedOtp !== otp) throw new Error("Invalid OTP");

//   // 1. Find User and Profile
//   let user = await User.findOne({ phone });
//   const isNewUser = !user;

//   if (!user) {
//     user = await User.create({ phone });
//   }

//   // 2. Mark verified and Generate Tokens
//   user.isPhoneVerified = true;
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();

//   // Save refresh token logic (as per your existing code)
//   const refreshHash = utils.hashToken(refreshTokenRaw);
//   user.refreshTokens.push({
//     tokenHash: refreshHash,
//     expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
//   });
//   await user.save();

//   // 3. Fetch/Update Profile (Saara profile data yahan se aayega)
//   const profile = await profileModel.findOneAndUpdate(
//     { userId: user._id },
//     { $set: { "onboardingProgress.phoneVerified": true } },
//     { upsert: true, new: true } // new: true taaki updated data mile
//   ).lean();

//   await redis.del(redisKey);

//   // 4. THE MASTER RESPONSE (Manager's Requirement)
//   return {
//     accessToken,
//     refreshToken: refreshTokenRaw,
//     isNewUser,
//     user: {
//       // --- Root User Fields ---
//       id: user._id,
//       phone: user.phone,
//       email: user.email || "",
//       role: user.role,
//       isPremium: user.isPremium || false,
//       isPhoneVerified: user.isPhoneVerified,
//       isEmailVerified: user.isEmailVerified,

//       // --- Nested Profile Data (Exactly as per your JSON) ---
//       profile: {
//         nickname: profile.nickname || "",
//         dob: profile.dob || "",
//         age: profile.age || null,
//         gender: profile.gender || "",
//         height: profile.height || null,
//         about: profile.about || "",
//         jobTitle: profile.jobTitle || "",
//         company: profile.company || "",
//         school: profile.school || "",
//         totalCompletion: profile.totalCompletion || 0
//       },
//       attributes: profile.attributes || {},
//       discovery: profile.discovery || {},
//       photos: profile.photos || [],
//       location: profile.location || {},
//       verification: profile.verification || { status: "pending" },
//       subscription: profile.subscription || {},
//       settings: profile.settings || {},
//       blockedContacts: profile.blockedContacts || [],
//       blockedUsers: profile.blockedUsers || [],

//       // --- Account Management (The Status Block) ---
//       account: {
//         status: user.accountStatus || "active",
//         banDetails: user.banDetails || { isBanned: false },
//         deactivationDetails: user.deactivationDetails || { isDeactivated: false },
//         deletionDetails: user.deletionDetails || { isScheduledForDeletion: false }
//       },

//       onboarding: getNextStep(user),
//       lastProfileUpdate: profile.updatedAt,
//       createdAt: user.createdAt
//     }
//   };
// }

async function verifyPhoneOtpUnified(phone, otp) {
  const redisKey = `login:${phone}`;
  const storedOtp = await redis.get(redisKey);

  if (!storedOtp) throw new Error("OTP expired or not found");
  if (storedOtp !== otp) throw new Error("Invalid OTP");

  // ✅ Find user or create user automatically
  let user = await User.findOne({ phone });
  const isNewUser = !user;
  if (!user) {
    user = await User.create({ phone });
  }

  user.isPhoneVerified = true; // phone verified in both case

  // // ✅ Device save karo if provided
  // if (deviceId) {
  //   user.devices = user.devices || [];
  //   user.devices.push({ deviceId, deviceType, fcmToken });
  // }

  // ✅ Tokens generate karo
  const accessToken = utils.generateAccessToken(user);
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshHash = utils.hashToken(refreshTokenRaw);

  user.refreshTokens.push({
    tokenHash: refreshHash,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
  });

  await user.save();
  await profileModel.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        phone: normalizedPhone,
        phoneHash: phoneHash, // 🔥 CRITICAL LINE
        isPhoneVerified: true,
        isNewUser: false,
        lastLoginAt: new Date(),
      },
      $push: {
        refreshTokens: {
          tokenHash: refreshHash,
          expiresAt,
        },
      },
    },
    { upsert: true }
  );

  // 7️⃣ Profile upsert
  const profile = await profileModel
    .findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.phoneVerified": true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    .lean();

  // 8️⃣ Blocks (as is)
  const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  let subData = await UserSubscription.findOne({ userId: user._id });
  if (!subData) {
    // Naya user hai toh default create karo
    subData = await UserSubscription.create({ userId: user._id });
  }
  // Reset counters if it's a new day
  subData.resetIfNeeded();
  await redis.del(redisKey);

  return {
    userId: user._id,
    accessToken,
    refreshToken: refreshTokenRaw,
    isNewUser: !user.firstName,
    user: formatUserProfile(
      user,
      profile,
      blockedContacts,
      blockedUser,
      subData
    ),
  };
}

// async function verifyPhoneOtpUnified(phone, otp) {
//   // 1. Redis/OTP Logic...
//   const redisKey = `login:${phone}`;
//   const storedOtp = await redis.get(redisKey);
//   if (!storedOtp || storedOtp !== otp) throw new Error("Invalid OTP");

//   // 2. User/Profile Fetch
//   let user = await User.findOne({ phone });
//   if (!user) user = await User.create({ phone });

//   user.isPhoneVerified = true;
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshHash = utils.hashToken(refreshTokenRaw);
//   const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 din ki expiry
//   // ... Token Save Logic ...
//   user = await User.findByIdAndUpdate(
//     user._id,
//     {
//       $set: { isPhoneVerified: true, isNewUser: false },
//       $push: {
//         refreshTokens: { tokenHash: refreshHash, expiresAt: expiresAt }
//       }
//     },
//     { new: true } // Taaki updated user return ho
//   );
//   // await user.save();

//   // const profile = await profileModel.findOne({ userId: user._id }).lean();
//   const profile = await profileModel.findOneAndUpdate(
//     { userId: user._id },
//     { $set: { "onboardingProgress.phoneVerified": true } }, // Minimal update to trigger upsert
//     { upsert: true, new: true, setDefaultsOnInsert: true }
//   ).lean();

//    const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(), // 'user' ki jagah 'userId'
//     Block.find({ blockerId: user._id }).lean()       // 'userId' ki jagah 'user._id'
//   ]);

//   await redis.del(redisKey);

//   // 3. Final Response Using Formatter
//   return {
//     accessToken,
//     refreshToken: refreshTokenRaw,
//     isNewUser: !user.firstName,
//     user: formatUserProfile(user, profile,blockedContacts,blockedUser) // Yahan magic ho raha hai
//   };
// }

// function getNextStep(user) {
//   if (!user.isEmailVerified) {
//     return {
//       currentScreenSlug : "email_verification",
//       message: "Verify your email",
//     };
//   }

// Check profile completion via Profile model
// Return appropriate next step

// return {
//   screen: "profile_setup",
//   message: "Complete your profile",
// };
// }

async function verifyPhoneOtp(phone, otp) {
  const user = await User.findOne({ phone });
  if (!user) throw new Error("Phone not found");

  if (!user.phoneOtp || user.phoneOtp !== otp) {
    throw new Error("Invalid OTP");
  }

  if (
    !user.phoneOtp ||
    !user.phoneOtpExpires ||
    Date.now() > user.phoneOtpExpires
  ) {
    throw new Error("OTP expired or not found");
  }

  // const valid = await utils.verifyOtpHash(otp, user.phoneOtpHash);
  // if (!valid) throw new Error("Invalid OTP");

  user.isPhoneVerified = true;
  user.phoneOtpHash = undefined;
  user.phoneOtpExpires = undefined;
  await user.save();

  return user;
}

async function sendEmailOtp(userId, email) {
  // Ensure phone verified before email step
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.isPhoneVerified)
    throw new Error("Phone must be verified before email verification");

  // If email already used by another account
  const existing = await User.findOne({ email });
  if (existing && existing._id.toString() !== userId.toString()) {
    throw new Error("Email already in use");
  }

  // Save email to user
  user.email = email;

  // Generate RAW OTP
  const otp = utils.generateOtp(); // e.g., "123456"

  // Store RAW OTP instead of hash
  user.emailOtp = otp; // <-- raw
  user.emailOtpExpires = Date.now() + EMAIL_OTP_TTL_MS;

  await user.save();

  // send email
  const subject = "Your verification code";
  const text = `Your email verification code is ${otp}`;
  await utils.sendEmail(email, subject, text);

  return { ok: true };
}

async function verifyEmailOtp(userId, otp) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Check OTP existence + expiry
  if (!user.emailOtp || !user.emailOtpExpires) {
    throw new Error("OTP not found");
  }

  if (Date.now() > user.emailOtpExpires) {
    throw new Error("OTP expired");
  }

  // Validate OTP (plain text)
  if (otp !== user.emailOtp) {
    throw new Error("Invalid OTP");
  }

  user.isEmailVerified = true;
  user.emailOtp = undefined;
  user.emailOtpExpires = undefined;
  await user.save();

  // Profile update and fetch
  // const profile = await profileModel.findOneAndUpdate(
  //   { userId: user._id },
  //   { $set: { "onboardingProgress.emailVerified": true } },
  //   { upsert: true, new: true }
  // ).lean();

  // // Formatter use karke pura data return karo
  // return {
  //   // accessToken: utils.generateAccessToken(user), // Optional: Naya token de sakte ho
  //   user: formatUserProfile(user, profile)
  // };
  const [profile, blockedContacts, blockedUser] = await Promise.all([
    profileModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.emailVerified": true } },
      { upsert: true, new: true, lean: true }
    ),
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  return {
    // Return the formatted user including block lists
    user: formatUserProfile(user, profile, blockedContacts, blockedUser),
  };
}

async function loginSendOtp(phone, ip) {
  if (!phone) throw new Error("Phone is required");

  // RATE LIMIT BASED ON IP
  const rateKey = `rl:login:${ip}`;
  const count = await redis.incr(rateKey);

  if (count === 1) {
    await redis.expire(rateKey, RATE_LIMIT_WINDOW);
  }

  if (count > RATE_LIMIT_MAX) {
    throw new Error("Too many attempts. Try again later.");
  }

  // Ensure user exists
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone });
  }

  // Generate OTP
  const otp = utils.generateOtp();

  // Store OTP in Redis
  const redisKey = `login:${phone}`;
  await redis.set(redisKey, otp, "EX", OTP_TTL);

  // Queue SMS job
  await smsQueue.add("send-otp", { phone, otp });

  return { ok: true };
}

async function loginVerifyOtp(phone, otp) {
  if (!phone || !otp) throw new Error("Phone and OTP required");

  const redisKey = `login:${phone}`;
  const storedOtp = await redis.get(redisKey);

  if (!storedOtp) {
    throw new Error("OTP expired or not found");
  }

  if (otp !== storedOtp) {
    throw new Error("Invalid OTP");
  }

  // OTP is valid → find user
  const user = await User.findOne({ phone });
  if (!user) throw new Error("User not found");

  user.isPhoneVerified = true;

  // Create tokens
  const accessToken = utils.generateAccessToken(user);
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshTokenHash = utils.hashToken(refreshTokenRaw);

  user.refreshTokens.push({
    tokenHash: refreshTokenHash,
    expiresAt: Date.now() + utils.REFRESH_TOKEN_TTL,
  });

  await user.save();

  // Clear OTP after success
  await redis.del(redisKey);

  return { user, accessToken, refreshToken: refreshTokenRaw };
}

async function refreshAccessToken(refreshTokenRaw) {
  // 🔐 1) Hash incoming token
  const incomingHash = utils.hashToken(refreshTokenRaw);

  // 👤 2) Find user by refresh token
  const user = await User.findOne({
    "refreshTokens.tokenHash": incomingHash,
  });

  if (!user) {
    throw new Error("Invalid refresh token");
  }

  // 🧹 3) Remove expired tokens
  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.expiresAt > Date.now()
  );

  // 🔍 4) Ensure token still exists
  const stillValid = user.refreshTokens.some(
    (rt) => rt.tokenHash === incomingHash
  );

  if (!stillValid) {
    throw new Error("Refresh token expired");
  }

  // 🔑 5) Generate new access token
  const accessToken = utils.generateAccessToken(user);

  // 6. Profile fetch karo (Empty string handling ke liye)
  // const profile = await profileModel.findOne({ userId: user._id }).lean();
  const [profile, blockedContacts, blockedUser] = await Promise.all([
    profileModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.emailVerified": true } },
      { upsert: true, new: true, lean: true }
    ),
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  await user.save();

  // 7. RETURN MASTER FORMAT
  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: formatUserProfile(user, profile, blockedContacts, blockedUser),
  };
}

// async function refreshAccessToken(refreshTokenRaw) {
//   // 🔐 1) Hash incoming token
//   const incomingHash = utils.hashToken(refreshTokenRaw);

//   // 👤 2) Find user by refresh token
//   const user = await User.findOne({
//     "refreshTokens.tokenHash": incomingHash
//   });

//   if (!user) {
//     throw new Error("Invalid refresh token");
//   }

//   // 🧹 3) Remove expired tokens
//   user.refreshTokens = user.refreshTokens.filter(
//     rt => rt.expiresAt > Date.now()
//   );

//   // 🔍 4) Ensure token still exists
//   const stillValid = user.refreshTokens.some(
//     rt => rt.tokenHash === incomingHash
//   );

//   if (!stillValid) {
//     throw new Error("Refresh token expired");
//   }

//   // 🔑 5) Generate new access token
//   const accessToken = utils.generateAccessToken(user);

//   // 📄 6) Fetch profile
//   const profile = await Profile.findOne({ userId: user._id }).lean();
//   if (!profile) {
//     throw new Error("Profile not found");
//   }

//   await user.save();

//   // 🎯 7) SAME formatter as getMyProfile
//   const formattedProfile = formatProfileResponse(profile, user);

//   return {
//     accessToken,
//     profile: formattedProfile
//   };
// }

// async function logout(userId, refreshTokenRaw) {
//   const user = await User.findById(userId);
//   if (!user) return;
//   const incomingHash = utils.hashToken(refreshTokenRaw);
//   user.refreshTokens = user.refreshTokens.filter(
//     (rt) => rt.tokenHash !== incomingHash
//   );
//   await user.save();
//   return;
// }

// auth.service.js
async function logout(refreshTokenRaw) {
  const incomingHash = utils.hashToken(refreshTokenRaw);

  const user = await User.findOne({
    "refreshTokens.tokenHash": incomingHash,
  });

  if (!user) {
    // Security reason: logout should be idempotent
    // Agar token already invalid hai toh bhi success
    return;
  }

  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.tokenHash !== incomingHash
  );

  await user.save();
}

// In auth.service.js - Update sendPhoneOtp function
async function sendPhoneOtpTest(phone, testMode = false) {
  const normalizedPhone = phone.trim();
  console.log("📲 Processing OTP for:", normalizedPhone);

  // Find or create user
  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) user = await User.create({ phone: normalizedPhone });

  // Generate OTP
  const otp = utils.generateOtp();
  const redisKey = `login:${normalizedPhone}`;

  // Store in Redis with TTL
  await redis.set(redisKey, otp, "EX", 300);
  console.log(`🔑 OTP saved in Redis (${redisKey}):`, otp);

  // In test mode, don't send actual SMS
  if (!testMode) {
    await utils.sendSms(normalizedPhone, `Your MAFS OTP is ${otp}`);
  }

  // Save device + fcm if new login attempt
  await user.save();

  return {
    success: true,
    otp, // Always return OTP in response
    message: testMode ? "OTP generated (test mode)" : "OTP sent successfully",
  };
}

module.exports = {
  sendPhoneOtp,
  verifyPhoneOtpUnified,
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp,
  loginSendOtp,
  loginVerifyOtp,
  refreshAccessToken,
  logout,
  sendPhoneOtpTest,
  // socialAuthHandler
};

// async function verifyEmailOtp(userId, otp) {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");

//   if (!user.emailOtpExpires || Date.now() > user.emailOtpExpires) {
//     throw new Error("OTP expired or not found");
//   }

//   // const valid = await utils.verifyOtpHash(otp, user.emailOtpHash);
//   // if (!valid) throw new Error("Invalid OTP");

//   // user.isEmailVerified/* = true;
//   user.emailOtpHash = undefined;
//   user.emailOtpExpires = undefined;

//   // create refresh token and access token (email verified => completed signup)
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshTokenHash = utils.hashToken(refreshTokenRaw);
//   user.refreshTokens.push({
//     tokenHash: refreshTokenHash,
//     expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS
//   });

//   await user.save();

//   return { user, accessToken, refreshToken: refreshTokenRaw };
// }

// login: send otp to phone (if not phone verified, still allow OTP to login? you said login with phone OTP)
// async function loginSendOtp(phone) {
//   // must exist; create if not
//   let user = await User.findOne({ phone });
//   if (!user) {
//     user = await User.create({ phone });
//   }

//   const otp = utils.generateOtp();
//   // const otpHash = await utils.hashOtp(otp);
//   user.phoneOtp = otp;
//   user.phoneOtpExpires = Date.now() + PHONE_OTP_TTL_MS;
//   await user.save();

//   const message = `Your login code is ${otp}`;
//   await utils.sendSms(phone, message);

//   return { ok: true };
// }

// async function loginVerifyOtp(phone, otp) {
//   const user = await User.findOne({ phone });
//   if (!user) throw new Error("User not found");

//   // check OTP expiration
//   if (!user.phoneOtp || !user.phoneOtpExpires || Date.now() > user.phoneOtpExpires) {
//     throw new Error("OTP expired or not found");
//   }

//   // compare raw OTP
//   if (otp !== user.phoneOtp) {
//     throw new Error("Invalid OTP");
//   }

//   // mark phone verified
//   user.isPhoneVerified = true;

//   // clear OTP fields
//   // user.phoneOtp = undefined;
//   // user.phoneOtpExpires = undefined;

//   // generate tokens
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshTokenHash = utils.hashToken(refreshTokenRaw);

//   user.refreshTokens.push({
//     tokenHash: refreshTokenHash,
//     expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS
//   });

//   await user.save();

//   return { user, accessToken, refreshToken: refreshTokenRaw };
// }

// login verify: if user is phone verified, issue tokens; if not phone verified but OTP matched, mark phone verified and issue tokens?
// async function loginVerifyOtp(phone, otp) {
//   const user = await User.findOne({ phone });
//   if (!user) throw new Error("User not found");

//   if (!user.phoneOtpExpires || Date.now() > user.phoneOtpExpires) {
//     throw new Error("OTP expired or not found");
//   }

//   // const valid = await utils.verifyOtpHash(otp, user.phoneOtpHash);
//   // if (!valid) throw new Error("Invalid OTP");

//   // mark phone verified if not already
//   user.isPhoneVerified = true;
//   user.phoneOtpHash = undefined;
//   user.phoneOtpExpires = undefined;

//   // create tokens
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshTokenHash = utils.hashToken(refreshTokenRaw);
//   user.refreshTokens.push({
//     tokenHash: refreshTokenHash,
//     expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS
//   });

//   await user.save();

//   return { user, accessToken, refreshToken: refreshTokenRaw };
// }

// async function socialAuthHandler(email, provider, providerId) {
//   let user = await User.findOne({ email });

//   // If first time social login → create new user
//   if (!user) {
//     user = await User.create({
//       email,
//       isEmailVerified: true,
//       social: {
//         provider,
//         providerId
//       }
//     });
//   }

//   // create access & refresh tokens
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshTokenHash = utils.hashToken(refreshTokenRaw);

//   user.refreshTokens.push({
//     tokenHash: refreshTokenHash,
//     expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS
//   });

//   await user.save();

//   return {
//     userId: user._id,
//     accessToken,
//     refreshToken: refreshTokenRaw,
//     isProfileCompleted: user.isProfileCompleted
//   };
// }
// const { OAuth2Client } = require("google-auth-library");
// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// module.exports.googleLogin = async (idToken) => {
//   const ticket = await googleClient.verifyIdToken({
//     idToken,
//     audience: process.env.GOOGLE_CLIENT_ID
//   });

//   const payload = ticket.getPayload();
//   if (!payload.email) throw new Error("Google email not found");

//   return socialAuthHandler(
//     payload.email,
//     "google",
//     payload.sub
//   );
// };
// const fetch = require("node-fetch");
// module.exports.facebookLogin = async (accessToken) => {
//   const response = await fetch(
//     `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,email`
//   );

//   const data = await response.json();
//   if (!data.email) throw new Error("Facebook email not found");

//   return socialAuthHandler(
//     data.email,
//     "facebook",
//     data.id
//   );
// };
// const jwt = require("jsonwebtoken");
// module.exports.appleLogin = async (idToken) => {
//   const decoded = jwt.decode(idToken);

//   if (!decoded || !decoded.email) {
//     throw new Error("Apple email not found");
//   }

//   return socialAuthHandler(
//     decoded.email,
//     "apple",
//     decoded.sub
//   );
// };
