// modules/Admin/auth/auth.services.js
const User = require("../../auth/auth.model");
const utils = require("../../auth/auth.utils");
const redis = require("../../../config/cache");

/**
 * Handles the logic for generating OTP and preparing the notification
 */
module.exports.initiateAdminPasswordReset = async (email) => {
  // 1. Database Check (Ensure 'email' and 'role' are indexed in MongoDB)
  const admin = await User.findOne({ email, role: "ADMIN" }).select(
    "_id email"
  );
  if (!admin) return null;

  // 2. Generate OTP

  const otp = utils.generateOtp();
  const otpHash = await utils.hashOtp(otp);

  // 3. Redis Save (Fast)
  const redisKey = `admin:email:otp:${admin._id}`;
  await redis.set(redisKey, otpHash, { EX: 300 }); // 5 mins

  // 4. Return the OTP and Admin info for the controller
  return otp;
};

module.exports.verifyAdminOTP = async (email, inputOtp) => {
  const admin = await User.findOne({ email, role: "ADMIN" }).select("_id");
  if (!admin) return { valid: false, message: "ADMIN_NOT_FOUND" };

  const redisKey = `admin:email:otp:${admin._id}`;
  const savedOtpHash = await redis.get(redisKey);

  if (!savedOtpHash) return { valid: false, message: "OTP_EXPIRED" };

  const isMatch = await utils.verifyOtpHash(inputOtp, savedOtpHash);
  if (!isMatch) return { valid: false, message: "INVALID_OTP" };

  await redis.del(redisKey);

  const verificationToken = `verified:reset:${admin._id}`;
  await redis.set(verificationToken, "true", { EX: 600 }); // 10 mins

  return { valid: true, adminId: admin._id };
};

module.exports.resetAdminPassword = async (email, newPassword) => {
  const admin = await User.findOne({ email, role: "ADMIN" });
  if (!admin) return { success: false, message: "ADMIN_NOT_FOUND" };

  const proofKey = `verified:reset:${admin._id}`;
  const isVerified = await redis.get(proofKey);

  if (!isVerified) {
    return { success: false, message: "VERIFICATION_REQUIRED" };
  }

  admin.password = await utils.passwordHashed(newPassword);
  admin.refreshTokens = []; // Force logout from all devices
  await admin.save();

  await redis.del(proofKey);

  return { success: true };
};

module.exports.updateAuthenticatedAdminPassword = async (
  adminId,
  currentPassword,
  newPassword
) => {
  const admin = await User.findOne({ _id: adminId, role: "ADMIN" }).select(
    "+password"
  );

  if (!admin) return { success: false, message: "ADMIN_NOT_FOUND" };

  const isMatch = await utils.passwordCompared(currentPassword, admin.password);
  if (!isMatch) return { success: false, message: "INVALID_PASSWORD" };

  // 3. Hash and Save
  admin.password = await utils.passwordHashed(newPassword);
  admin.refreshTokens = []; // Security: Logout from all other devices/sessions
  await admin.save();

  return { success: true };
};
