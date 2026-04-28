const { smsQueue } = require("../../common/queues");
const redis = require("../../config/cache");
const profileModel = require("../profile/profile.model");
const User = require("./auth.model");
const utils = require("./auth.utils");
// const { formatUserProfile } = require("./auth.formatter");
const BlockedContact = require("../BlockedContact/blockedContacts.model");
const Block = require("../profile/user.block");
const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");
const UserSubscription = require("../auth/UserSubscription.model");
const { formatProfileResponse } = require("../profile/profile.formatter");
const subscriptionService = require("../subscription/services/subscription.service");
const EMAIL_OTP_TTL_MS = Number(1000 * 60 * 10); // 10 min
const OTP_TTL = 300; // 5 minutes
const RATE_LIMIT_MAX = 2; // max OTP requests allowed
const RATE_LIMIT_WINDOW = 60; // per 60 seconds

async function sendPhoneOtp(phone) {
  const normalizedPhone = phone.trim();
  // console.log("📲 Saving OTP for:", normalizedPhone);

  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) user = await User.create({ phone: normalizedPhone, isTest: normalizedPhone.startsWith("+1000") });

  const otp = utils.generateOtp();

  const redisKey = `login:${normalizedPhone}`; // ✅ exact same key format
  // console.log("🔑 OTP saved in Redis Key:", redisKey);

  await redis.set(redisKey, otp, "EX", 300);

  await utils.sendSms(normalizedPhone, `Your MAFS OTP is ${otp}`);

  // Save device + fcm if new login attempt
  // user.devices.push({ deviceId, deviceType, fcmToken });
  await user.save();

  return { ok: true };
}

async function verifyPhoneOtpUnified(phone, otp, req) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("Invalid phone number");

  const TEST_PHONE = "+61800000000";
  const isPlayStoreReview = (normalizedPhone === TEST_PHONE && otp === "123456");

  let isValidOtp = false;

  const redisKey = `user:otp:sms:${normalizedPhone}`;
  const attemptsKey = `user:otp:attempts:sms:${normalizedPhone}`;

  if (isPlayStoreReview) {
    isValidOtp = true;
  } else {
    const otpHash = await redis.get(redisKey);
    if (!otpHash) {
      throw new Error("OTP expired or invalid");
    }

    isValidOtp = await utils.verifyOtpHash(otp, otpHash);

    if (!isValidOtp) {
      const attempts = Number(await redis.get(attemptsKey)) || 0;
      await redis.set(attemptsKey, attempts + 1, { EX: 300 });
      throw new Error("Invalid OTP");
    }

    await Promise.all([redis.del(redisKey), redis.del(attemptsKey)]);
  }

  const phoneHash = hashPhone(normalizedPhone);

  // ONE-SHOT LOGIN: Merge 3 Atlas roundtrips into 1.
  // Old code (3 roundtrips) commented out below for reference.
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshHash = utils.hashToken(refreshTokenRaw);
  const isPlayStoreExpiry = normalizedPhone === "+61800000000";
  const expiresAt = new Date(Date.now() + (isPlayStoreExpiry ? 10 * 365 * 24 * 60 * 60 * 1000 : utils.REFRESH_TOKEN_TTL));

  const userBefore = await User.findOne({ phoneHash }).lean();
  const isNewUser = !userBefore;
  const isFirstVerification = !userBefore || !userBefore.isPhoneVerified;

  // Ban/Suspension check BEFORE doing the expensive update
  if (userBefore?.banDetails?.isBanned) {
    throw new Error("Your account has been banned. Please contact support.");
  }
  if (
    userBefore?.suspensionDetails?.isSuspended &&
    userBefore.suspensionDetails.suspendUntil > new Date()
  ) {
    throw new Error(
      `Your account is suspended until ${userBefore.suspensionDetails.suspendUntil.toISOString()}`,
    );
  }

  // Single upsert: creates if new, updates if existing (1 Atlas roundtrip)
  const user = await User.findOneAndUpdate(
    { phoneHash },
    {
      $set: {
        phone: normalizedPhone,
        phoneHash,
        authMethod: "phone",
        isPhoneVerified: true,
        isNewUser: false,
        lastLoginAt: new Date(),
        isTest: normalizedPhone.startsWith("+1000"),
      },
      $push: {
        refreshTokens: {
          $each: [{ tokenHash: refreshHash, expiresAt }],
          $slice: -5,
        },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const accessToken = utils.generateAccessToken(user);

  // Profile, Blocked, Subscription queries
  const profile = await profileModel
    .findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.phoneVerified": true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    .lean();

  const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  let subData = await UserSubscription.findOne({ userId: user._id });
  if (!subData) {
    subData = await UserSubscription.create({ userId: user._id });
  }
  subData.resetIfNeeded();

  // ➕ Initiative 3: First 1000 Users Milestone Eligibility
  if (isFirstVerification) {
    const SubscriptionConfig = require("../subscription/models_v3/SubscriptionConfig");
    const config = await SubscriptionConfig.findOneAndUpdate(
      {}, // Singleton document
      { $inc: { "milestone.currentCount": 1 } },
      { new: true, upsert: true }
    );

    const rank = config.milestone.currentCount;
    const isEligible = rank <= (config.milestone.targetUserCount || 1000);
    const offerExpiresAt = new Date();
    offerExpiresAt.setDate(offerExpiresAt.getDate() + 3);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        registrationRank: rank,
        "giveaway.isEligibleForFreeTrial": isEligible,
        "giveaway.offerExpiresAt": offerExpiresAt,
        "giveaway.freeTrialDurationDays": config.milestone.grantDurationDays || 30
      }
    });

    logger.info(`Milestone eligibility assigned to User ${user._id} (Rank: ${rank}, Eligible: ${isEligible})`);
  }

  return {
    user: await formatProfileResponse(
      user,
      profile,
      blockedContacts,
      blockedUser,
      subData,
      req,
    ),
    accessToken,
    refreshToken: refreshTokenRaw,
    isNewUser,
    isFirstVerification,
  };
}

// async function verifyPhoneTestOtpUnified(phone, otp, req) {
//   // 1️⃣ Normalize phone (VERY IMPORTANT)
//   const normalizedPhone = normalizePhone(phone);
//   if (!normalizedPhone) throw new Error("Invalid phone number");

//   // 2️⃣ Redis OTP check
//   const redisKey = `login:${normalizedPhone}`;
//   const storedOtp = await redis.get(redisKey);
//   if (!storedOtp || storedOtp !== otp) {
//     throw new Error("Invalid OTP");
//   }

//   // 3️⃣ Extract Device Info from Flutter Request
//   // Frontend se ye fields body mein bhejne honge (deviceId, deviceName, platform, os)
//   const { deviceId, deviceName, platform, os } = req.body;
//   const currentIp =
//     req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

//   const phoneHash = hashPhone(normalizedPhone);

//   let user = await User.findOne({ phone: normalizedPhone });
//   const isFirstVerification = !user || !user.isPhoneVerified; // Milestone logic fix
//   // const isNewUser = !user;

//   if (!user) {
//     user = await User.create({
//       phone: normalizedPhone,
//       phoneHash: phoneHash,
//     });
//   }

//   // ACCOUNT STATE CHECK (CRITICAL)
//   // if (user.banDetails?.isBanned) {
//   //   throw new Error("Your account has been banned. Please contact support.");
//   // }
//   // if (
//   //   user.suspensionDetails?.isSuspended &&
//   //   user.suspensionDetails.suspendUntil > new Date()
//   // ) {
//   //   throw new Error(
//   //     `Your account is suspended until ${user.suspensionDetails.suspendUntil.toISOString()}`
//   //   );
//   // }

//   // 4️⃣ Auth Tokens Generation (Existing)
//   const accessToken = utils.generateAccessToken(user);
//   const refreshTokenRaw = utils.generateRefreshToken();
//   const refreshHash = utils.hashToken(refreshTokenRaw);
//   const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

//   // 5️⃣ SESSION & HISTORY LOGIC
//   const sessionData = {
//     deviceId: deviceId || "unknown",
//     deviceName: deviceName || "Unknown Device",
//     platform: platform || "web",
//     os: os || "Unknown OS",
//     lastIp: currentIp,
//     lastUsedAt: new Date(),
//     isActive: true,
//   };

//   const historyEntry = {
//     ip: currentIp,
//     device: deviceName || "Unknown Device",
//     timestamp: new Date(),
//     authMethod: "phone",
//     status: "success",
//   };

//   // 6️⃣ UPDATE USER (Atomic Update with Sessions & History)
//   const updateQuery = {
//     $set: {
//       phone: normalizedPhone,
//       phoneHash: phoneHash,
//       isPhoneVerified: true,
//       isNewUser: false,
//       lastLoginAt: new Date(),
//       currentIp: currentIp, // New Field
//       lastUsedDevice: deviceName, // New Field
//     },
//     $push: {
//       refreshTokens: { tokenHash: refreshHash, expiresAt },
//       loginHistory: { $each: [historyEntry], $slice: -15 }, // Last 15 login history rakhega
//     },
//   };

//   // Session logic: Agar deviceId pehle se hai toh update, warna push
//   // Mongoose mein array of objects update karne ke liye ye best way hai:
//   user = await User.findById(user._id, { new: true });
//   const existingSessionIndex = user.sessions.findIndex(
//     (s) => s.deviceId === deviceId,
//   );

//   if (existingSessionIndex !== -1) {
//     user.sessions[existingSessionIndex] = sessionData;
//   } else {
//     user.sessions.push(sessionData);
//     if (user.sessions.length > 5) user.sessions.shift(); // Limit 5 devices per user
//   }

//   // Final Save with all other updates
//   Object.assign(user, updateQuery.$set);
//   user.refreshTokens.push(updateQuery.$push.refreshTokens);
//   user.loginHistory.push(historyEntry);
//   if (user.loginHistory.length > 15) user.loginHistory.shift();

//   await user.save();

//   // 7️⃣ REST OF YOUR LOGIC (Profile, Blocked, Subscription...)
//   const profile = await profileModel
//     .findOneAndUpdate(
//       { userId: user._id },
//       { $set: { "onboardingProgress.phoneVerified": true } },
//       { upsert: true, new: true, setDefaultsOnInsert: true },
//     )
//     .lean();

//   const [blockedContacts, blockedUser] = await Promise.all([
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean(),
//   ]);

//   let subData = await UserSubscription.findOne({ userId: user._id });
//   if (!subData) subData = await UserSubscription.create({ userId: user._id });
//   subData.resetIfNeeded();

//   // v3 Milestone: Grant premium to first 1000 users (Test mode)
//   if (isFirstVerification) {
//     await subscriptionService
//       .handleMilestoneGrant(user._id)
//       .catch((err) => console.error(err));
//   }

//   await redis.del(redisKey);

//   return {
//     accessToken,
//     refreshToken: refreshTokenRaw,
//     isNewUser: !user.firstName,
//     user: await formatProfileResponse(
//       user,
//       profile,
//       blockedContacts,
//       blockedUser,
//       req,
//     ),
//   };
// }

async function verifyPhoneTestOtpUnified(phone, otp, req) {
  // 1️⃣ Normalize phone (VERY IMPORTANT)
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("Invalid phone number");

  const TEST_PHONE = "+61800000000";
  const isPlayStoreReview = (normalizedPhone === TEST_PHONE && otp === "123456");

  // 2️⃣ Redis OTP check
  const redisKey = `login:${normalizedPhone}`;

  if (!isPlayStoreReview) {
    const storedOtp = await redis.get(redisKey);
    if (!storedOtp || storedOtp !== otp) {
      throw new Error("Invalid OTP");
    }
  }

  // 3️⃣ Extract Device Info from Flutter Request (deviceId, deviceName, platform, os)
  const { deviceId, deviceName, platform, os } = req.body;
  const currentIp =
    req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  const phoneHash = hashPhone(normalizedPhone);

  let user = await User.findOne({ phone: normalizedPhone });
  const isFirstVerification = !user || !user.isPhoneVerified;

  if (!user) {
    user = await User.create({
      phone: normalizedPhone,
      phoneHash: phoneHash,
      isTest: normalizedPhone.startsWith("+1000") // Assign test flag
    });
  }

  // 4️⃣ Auth Tokens Generation (Existing)
  const accessToken = utils.generateAccessToken(user);
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshHash = utils.hashToken(refreshTokenRaw);
  const isPlayStoreExpiry = normalizedPhone === "+61800000000";
  const expiresAt = new Date(Date.now() + (isPlayStoreExpiry ? 10 * 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000));

  // 5️⃣ SESSION & HISTORY LOGIC
  const sessionData = {
    deviceId: deviceId || "unknown",
    deviceName: deviceName || "Unknown Device",
    platform: platform || "web",
    os: os || "Unknown OS",
    lastIp: currentIp,
    lastUsedAt: new Date(),
    isActive: true,
  };

  const historyEntry = {
    ip: currentIp,
    device: deviceName || "Unknown Device",
    timestamp: new Date(),
    authMethod: "phone",
    status: "success",
  };

  // 6️⃣ UPDATE USER (Atomic Update with Sessions & History)
  user = await User.findById(user._id); // Latest data fetch karein

  // Array safety checks
  if (!user.sessions) user.sessions = [];
  if (!user.loginHistory) user.loginHistory = [];
  if (!user.refreshTokens) user.refreshTokens = [];

  const existingSessionIndex = user.sessions.findIndex(
    (s) => s.deviceId === deviceId,
  );

  if (existingSessionIndex !== -1) {
    user.sessions[existingSessionIndex] = sessionData;
  } else {
    user.sessions.push(sessionData);
    if (user.sessions.length > 5) user.sessions.shift();
  }

  // Update top-level fields
  user.phone = normalizedPhone;
  user.phoneHash = phoneHash;
  user.isPhoneVerified = true;
  user.isNewUser = false;
  user.lastLoginAt = new Date();
  user.currentIp = currentIp;
  user.lastUsedDevice = deviceName;

  // Push to history and tokens
  user.loginHistory.push(historyEntry);
  if (user.loginHistory.length > 15) user.loginHistory.shift();

  user.refreshTokens.push({ tokenHash: refreshHash, expiresAt });

  await user.save();

  // 7️⃣ REST OF YOUR LOGIC (Profile, Blocked, Subscription...)
  const profile = await profileModel
    .findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.phoneVerified": true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    .lean();

  const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  let subData = await UserSubscription.findOne({ userId: user._id });
  if (!subData) subData = await UserSubscription.create({ userId: user._id });
  subData.resetIfNeeded();

  // ➕ Initiative 3: First 1000 Users Milestone Eligibility (Test Mode)
  if (isFirstVerification) {
    const SubscriptionConfig = require("../subscription/models_v3/SubscriptionConfig");
    const config = await SubscriptionConfig.findOneAndUpdate(
      {},
      { $inc: { "milestone.currentCount": 1 } },
      { new: true, upsert: true }
    );

    const rank = config.milestone.currentCount;
    const isEligible = rank <= (config.milestone.targetUserCount || 1000);
    const offerExpiresAt = new Date();
    offerExpiresAt.setDate(offerExpiresAt.getDate() + 3);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        registrationRank: rank,
        "giveaway.isEligibleForFreeTrial": isEligible,
        "giveaway.offerExpiresAt": offerExpiresAt,
        "giveaway.freeTrialDurationDays": config.milestone.grantDurationDays || 30
      }
    });
  }

  await redis.del(redisKey);

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    isNewUser: !user.firstName,
    user: await formatProfileResponse(
      user,
      profile,
      blockedContacts,
      blockedUser,
      req,
    ),
  };
}

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

// async function sendEmailOtp(token, email) {

//   const decoded = utils.verifyToken(token);
//   const user = await User.findById(decoded.userId);

//   if (!user) throw new Error("User not found");
//   if (!user.isPhoneVerified) {
//     throw new Error("Phone must be verified before email verification");
//   }

//   const existing = await User.findOne({ email, _id: { $ne: user._id } });
//   if (existing) {
//     throw new Error("Email already in use");
//   }

//   user.email = email;
//   await user.save();

//   const otp = utils.generateOtp();

//   const redisKey = `user:email:otp:${user._id.toString()}`;
//   console.log("SETTING OTP IN REDIS:", redisKey);
//   await redis.set(redisKey, {otp}, { EX: EMAIL_OTP_TTL_MS / 1000 });

//   const subject = "Your verification code";
//   const text = `Your email verification code is ${otp}`;
//   await utils.sendEmail(email, subject, text);

//   return { ok: true };
// }

// async function verifyEmailOtp(token, otp) {
//   const decoded = utils.verifyToken(token);
//   const user = await User.findById(decoded.userId);

//   if (!user) throw new Error("User not found");

//   const redisKey = `user:email:otp:${user._id}`;
// console.log("🔥 GETTING OTP IN REDIS:", redisKey);
//   const storedOtp = await redis.get(redisKey);
//   if (!storedOtp) throw new Error("OTP expired");
//   if (String(otp) !== String(storedOtp)) throw new Error("Invalid OTP");

//   user.isEmailVerified = true;
//   await user.save();

//   await redis.del(redisKey);

//   const [profile, blockedContacts, blockedUser] = await Promise.all([
//     profileModel.findOneAndUpdate(
//       { userId: user._id },
//       { $set: { "onboardingProgress.emailVerified": true } },
//       { upsert: true, new: true, lean: true }
//     ),
//     BlockedContact.find({ userId: user._id }).lean(),
//     Block.find({ blockerId: user._id }).lean()
//   ]);

//   return {
//     user: formatUserProfile(user, profile, blockedContacts, blockedUser)
//   };
// }

async function verifyEmailOtp(token, otp, req) {
  const decoded = utils.verifyToken(token);

  const user = await User.findById(decoded.userId);
  if (!user) throw new Error("User not found");

  const isPlayStoreReview = (user.email === "test@keenasmustard.com" && otp === "123456");

  if (!isPlayStoreReview) {
    if (!user.emailOtp || !user.emailOtpExpires) throw new Error("OTP not found");
    if (Date.now() > user.emailOtpExpires) throw new Error("OTP expired");
    if (String(otp) !== String(user.emailOtp)) throw new Error("Invalid OTP");
  }

  // Email mark as verified
  user.isEmailVerified = true;
  user.emailOtp = undefined;
  user.emailOtpExpires = undefined;
  await user.save();
  const [profile, blockedContacts, blockedUser] = await Promise.all([
    profileModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.emailVerified": true } },
      { upsert: true, new: true, lean: true },
    ),
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  return {
    // Return the formatted user including block lists
    // user: formatUserProfile(user, profile, blockedContacts, blockedUser)
    user: await formatProfileResponse(
      user,
      profile,
      blockedContacts,
      blockedUser,
      req,
    ),
  };
}

async function sendEmailOtp(token, email) {
  // Verify token and get user
  const decoded = utils.verifyToken(token);
  const user = await User.findById(decoded.userId);

  if (!user) throw new Error("User not found");
  if (!user.isPhoneVerified) {
    throw new Error("Phone must be verified before email verification");
  }

  // If email already used by another account
  const existing = await User.findOne({ email, _id: { $ne: user._id } });
  if (existing) {
    throw new Error("Email already in use");
  }

  // Save email to user
  user.email = email;

  // Generate and store OTP
  const otp = utils.generateOtp();
  user.emailOtp = otp;
  user.emailOtpExpires = Date.now() + EMAIL_OTP_TTL_MS;

  await user.save();

  // 🛑 ISOLATION: Bypass actual email for review account
  if (email.toLowerCase() === "test@keenasmustard.com") {
    return { ok: true };
  }

  // Send email with OTP
  const subject = "Your verification code";
  const text = `Your email verification code is ${otp}`;
  await utils.sendEmail(email, subject, text);

  return { ok: true };
}

async function loginSendOtp(phone, ip) {
  if (!phone) throw new Error("Phone is required");

  if (phone === "+61800000000") {
    return { ok: true, isMocked: true };
  }

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
    user = await User.create({ phone, isTest: phone.startsWith("+1000") });
  }

  // Generate OTP
  const otp = utils.generateOtp();

  // Store OTP in Redis
  const redisKey = `login:${phone}`;
  await redis.set(redisKey, otp, "EX", OTP_TTL);

  // --- AUTH TEST BYPASS GUARD ---
  const isBypassEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_TEST_BYPASS_SMS === "true";
  const isTestNumber = phone.startsWith("+1000");

  if (isBypassEnabled && isTestNumber) {
    // console.log(`[AUTH_TEST_BYPASS] Skipping SMS Queue for ${phone}. OTP stored in Redis.`);
    return { ok: true, isMocked: true };
  }
  // ------------------------------

  // Queue SMS job
  await smsQueue.add("send-otp", { phone, otp });

  return { ok: true };
}

async function loginVerifyOtp(phone, otp) {
  if (!phone || !otp) throw new Error("Phone and OTP required");

  const TEST_PHONE = "+61800000000";
  const isPlayStoreReview = (phone === TEST_PHONE && otp === "123456");

  const redisKey = `login:${phone}`;
  if (!isPlayStoreReview) {
    const storedOtp = await redis.get(redisKey);

    if (!storedOtp) {
      throw new Error("OTP expired or not found");
    }

    if (otp !== storedOtp) {
      throw new Error("Invalid OTP");
    }
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

async function refreshAccessToken(refreshTokenRaw, req) {
  // 1. Hash incoming token to compare with DB

  if (!refreshTokenRaw) {
    throw new Error("Refresh token missing");
  }

  // 🧹 Safety: Agar galti se "Bearer " aa gaya ho
  if (refreshTokenRaw.startsWith("Bearer ")) {
    refreshTokenRaw = refreshTokenRaw.split(" ")[1];
  }
  const incomingHash = utils.hashToken(refreshTokenRaw);

  // 2. Find user who has this specific hash
  const user = await User.findOne({
    "refreshTokens.tokenHash": incomingHash,
  });

  if (!user) {
    throw new Error("Invalid refresh token"); // Database mein match nahi mila
  }

  // 3. Purane/Expired tokens hatao (Maintenance)
  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.expiresAt > Date.now(),
  );

  // 4. Double check ki current wala abhi bhi list mein hai (Expired toh nahi tha?)
  const isStillValid = user.refreshTokens.some(
    (rt) => rt.tokenHash === incomingHash,
  );

  if (!isStillValid) {
    await user.save(); // Clean up array in DB
    throw new Error("Refresh token expired");
  }

  // 5. Naya Access Token generate karo
  const accessToken = utils.generateAccessToken(user);

  // 6. Profile fetch karo (Empty string handling ke liye)
  // const profile = await profileModel.findOne({ userId: user._id }).lean();
  const [profile, blockedContacts, blockedUser] = await Promise.all([
    profileModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.emailVerified": true } },
      { upsert: true, new: true, lean: true },
    ),
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean(),
  ]);

  await user.save();

  // 7. RETURN MASTER FORMAT
  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: await formatProfileResponse(
      user,
      profile,
      blockedContacts,
      blockedUser,
      req,
    ),
  };
}

async function logout(refreshTokenRaw, deviceId) {
  const incomingHash = utils.hashToken(refreshTokenRaw);

  const user = await User.findOne({
    "refreshTokens.tokenHash": incomingHash,
  });

  if (!user) {
    // Security reason: logout should be idempotent
    // Agar token already invalid hai toh bhi success
    return;
  }

  // 1. Remove refresh token session
  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.tokenHash !== incomingHash,
  );

  // 2. Remove FCM token for this specific device
  if (deviceId) {
    user.fcmTokens = (user.fcmTokens || []).filter(
      (t) => t.deviceId !== deviceId
    );
  }

  await user.save();
}

async function sendPhoneOtpTest(phone, testMode = false) {
  const normalizedPhone = phone.trim();
  // console.log("📲 Processing OTP for:", normalizedPhone);

  // Find or create user
  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) user = await User.create({ phone: normalizedPhone });

  // Generate OTP
  let otp;
  if (normalizedPhone === "+61800000000") {
    otp = "123456";
  } else {
    otp = utils.generateOtp();
  }
  const redisKey = `login:${normalizedPhone}`;

  // Store in Redis with TTL
  await redis.set(redisKey, otp, "EX", 3000);
  // console.log(
  //   `🔑 mobile OTP saved in Redis (${redisKey}):`,
  //   otp,
  //   "redisKey",
  //   redisKey,
  // );

  if (!testMode) {
    await utils.sendSms(normalizedPhone, `Your MAFS OTP is ${otp}`);
  }

  await user.save();

  return {
    success: true,
    otp,
    message: testMode ? "OTP generated (test mode)" : "OTP sent successfully",
  };
}

module.exports = {
  logout,
  sendPhoneOtp,
  verifyPhoneOtpUnified,
  verifyPhoneTestOtpUnified,
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
