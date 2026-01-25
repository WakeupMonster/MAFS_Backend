const { smsQueue } = require("../../common/queues");
const redis = require("../../config/cache");
const profileModel = require("../profile/profile.model");
const User = require("./auth.model");
const utils = require("./auth.utils");
const { formatUserProfile } = require("./auth.formatter");
const BlockedContact = require("../BlockedContact/blockedContacts.model");
const Block = require("../profile/user.block")
const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");
const UserSubscription = require("../auth/UserSubscription.model")
const EMAIL_OTP_TTL_MS = Number(1000 * 60 * 10); // 10 min
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

async function verifyPhoneOtpUnified(phone, otp) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("Invalid phone number");

  const redisKey = `user:otp:sms:${normalizedPhone}`;
  const attemptsKey = `user:otp:attempts:sms:${normalizedPhone}`;

  const otpHash = await redis.get(redisKey);
  if (!otpHash) {
    throw new Error("OTP expired or invalid");
  }

  const isValidOtp = await utils.verifyOtpHash(otp, otpHash);
  if (!isValidOtp) {
    const attempts = Number(await redis.get(attemptsKey)) || 0;
    await redis.set(attemptsKey, attempts + 1, { EX: 300 });
    throw new Error("Invalid OTP");
  }

  await Promise.all([
    redis.del(redisKey),
    redis.del(attemptsKey)
  ]);

  const phoneHash = hashPhone(normalizedPhone);

  let user = await User.findOne({ phoneHash });
  const isNewUser = !user;

  if (!user) {
    user = await User.create({
      phone: normalizedPhone,
      phoneHash,
      authMethod: "phone",
      isNewUser: true
    });
  }

  if (user.banDetails?.isBanned) {
    throw new Error("Your account has been banned. Please contact support.");
  }
  if (
    user.suspensionDetails?.isSuspended &&
    user.suspensionDetails.suspendUntil > new Date()
  ) {
    throw new Error(
      `Your account is suspended until ${user.suspensionDetails.suspendUntil.toISOString()}`
    );
  }

  // 5️⃣ Tokens (UNCHANGED)
  const accessToken = utils.generateAccessToken(user);
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshHash = utils.hashToken(refreshTokenRaw);
  const expiresAt = new Date(Date.now() + utils.REFRESH_TOKEN_TTL);

  user = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        phone: normalizedPhone,
        phoneHash,
        isPhoneVerified: true,
        isNewUser: false,
        lastLoginAt: new Date()
      },
      $push: {
        refreshTokens: {
          tokenHash: refreshHash,
          expiresAt
        }
      }
    },
    { new: true }
  );

  const profile = await profileModel.findOneAndUpdate(
    { userId: user._id },
    { $set: { "onboardingProgress.phoneVerified": true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);

  let subData = await UserSubscription.findOne({ userId: user._id });
  if (!subData) {
    subData = await UserSubscription.create({ userId: user._id });
  }
  subData.resetIfNeeded();

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    isNewUser,
    user: formatUserProfile(
      user,
      profile,
      blockedContacts,
      blockedUser,
      subData
    )
  };
}


async function verifyPhoneTestOtpUnified(phone, otp) {
  // 1️⃣ Normalize phone (VERY IMPORTANT)
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("Invalid phone number");

  // 2️⃣ Redis OTP check
  const redisKey = `login:${normalizedPhone}`;
  const storedOtp = await redis.get(redisKey);
  if (!storedOtp || storedOtp !== otp) {
    throw new Error("Invalid OTP");
  }

  const phoneHash = hashPhone(normalizedPhone);

  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) {
    user = await User.create({
      phone: normalizedPhone,
      phoneHash: phoneHash 
    });
  }
// ACCOUNT STATE CHECK (CRITICAL)
if (user.banDetails?.isBanned) {
  throw new Error("Your account has been banned. Please contact support.");
}
if (
  user.suspensionDetails?.isSuspended &&
  user.suspensionDetails.suspendUntil > new Date()
) {
  throw new Error(
    `Your account is suspended until ${user.suspensionDetails.suspendUntil.toISOString()}`
  );
}

  const accessToken = utils.generateAccessToken(user);
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshHash = utils.hashToken(refreshTokenRaw);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  user = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        phone: normalizedPhone,
        phoneHash: phoneHash,   
        isPhoneVerified: true,
        isNewUser: false,
        lastLoginAt: new Date() 
      },
      $push: {
        refreshTokens: {
          tokenHash: refreshHash,
          expiresAt
        }
      }
    },
    { new: true }
  );

  const profile = await profileModel.findOneAndUpdate(
    { userId: user._id },
    { $set: { "onboardingProgress.phoneVerified": true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const [blockedContacts, blockedUser] = await Promise.all([
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);

  let subData = await UserSubscription.findOne({ userId: user._id });
  if (!subData) {
    subData = await UserSubscription.create({ userId: user._id });
  }
  subData.resetIfNeeded()
  await redis.del(redisKey);

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    isNewUser: !user.firstName,
    user: formatUserProfile(user, profile, blockedContacts, blockedUser,subData)
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


async function verifyEmailOtp(token, otp) {
  const decoded = utils.verifyToken(token);

  const user = await User.findById(decoded.userId);
  if (!user) throw new Error("User not found");

  if (!user.emailOtp || !user.emailOtpExpires) throw new Error("OTP not found");
  if (Date.now() > user.emailOtpExpires) throw new Error("OTP expired");
  if (String(otp) !== String(user.emailOtp)) throw new Error("Invalid OTP");

  // Email mark as verified
  user.isEmailVerified = true;
  user.emailOtp = undefined;
  user.emailOtpExpires = undefined;
  await user.save();
  const [profile, blockedContacts, blockedUser] = await Promise.all([
    profileModel.findOneAndUpdate(
      { userId: user._id },
      { $set: { "onboardingProgress.emailVerified": true } },
      { upsert: true, new: true, lean: true }
    ),
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);

  return {
    // Return the formatted user including block lists
    user: formatUserProfile(user, profile, blockedContacts, blockedUser)
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

  // Send email with OTP
  const subject = "Your verification code";
  const text = `Your email verification code is ${otp}`;
  await utils.sendEmail(email, subject, text);

  return { ok: true };
}
// async function verifyEmailOtp(token, otp) {
//   const decoded = utils.verifyToken(token);

//   const user = await User.findById(decoded.userId);
//   if (!user) throw new Error("User not found");

//   if (!user.emailOtp || !user.emailOtpExpires) throw new Error("OTP not found");
//   if (Date.now() > user.emailOtpExpires) throw new Error("OTP expired");
//   if (String(otp) !== String(user.emailOtp)) throw new Error("Invalid OTP");

//   // Email mark as verified
//   user.isEmailVerified = true;
//   user.emailOtp = undefined;
//   user.emailOtpExpires = undefined;
//   await user.save();
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
//     // Return the formatted user including block lists
//     user: formatUserProfile(user, profile, blockedContacts, blockedUser)
//   };
// }


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
    "refreshTokens.tokenHash": incomingHash
  });

  if (!user) {
    throw new Error("Invalid refresh token"); // Database mein match nahi mila
  }

  // 3. Purane/Expired tokens hatao (Maintenance)
  user.refreshTokens = user.refreshTokens.filter(
    rt => rt.expiresAt > Date.now()
  );

  // 4. Double check ki current wala abhi bhi list mein hai (Expired toh nahi tha?)
  const isStillValid = user.refreshTokens.some(
    rt => rt.tokenHash === incomingHash
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
      { upsert: true, new: true, lean: true }
    ),
    BlockedContact.find({ userId: user._id }).lean(),
    Block.find({ blockerId: user._id }).lean()
  ]);



  await user.save();

  // 7. RETURN MASTER FORMAT
  return {
    accessToken,
    refreshToken: refreshTokenRaw, 
    user: formatUserProfile(user, profile, blockedContacts, blockedUser)
  };
}
async function logout(refreshTokenRaw) {
  const incomingHash = utils.hashToken(refreshTokenRaw);

  const user = await User.findOne({
    "refreshTokens.tokenHash": incomingHash
  });

  if (!user) {
    // Security reason: logout should be idempotent
    // Agar token already invalid hai toh bhi success
    return;
  }

  user.refreshTokens = user.refreshTokens.filter(
    rt => rt.tokenHash !== incomingHash
  );

  await user.save();
}

module.exports = {
  logout
};


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
  await redis.set(redisKey, otp, "EX", 3000);
  console.log(`🔑 mobile OTP saved in Redis (${redisKey}):`, otp,"redisKey",redisKey);

  if (!testMode) {
    await utils.sendSms(normalizedPhone, `Your MAFS OTP is ${otp}`);
  }

  await user.save();

  return { 
    success: true, 
    otp, 
    message: testMode ? "OTP generated (test mode)" : "OTP sent successfully"
  };
}

module.exports = {
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
   sendPhoneOtpTest
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




