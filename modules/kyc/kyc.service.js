// src/modules/kyc/kyc.service.js

const Kyc = require("./kyc.model");
// const User = require("../auth/auth.model");
const profileModel = require("../profile/profile.model");

module.exports.createOrUpdateKyc = async (userId, selfieUrl) => {
  // Ensure user exists
  // const user = await User.findById(userId);
  // if (!user) throw new Error("User not found");
    const profile = await profileModel.findOne({ userId });
  if (!profile) throw new Error("Profile not found");

  // Create or update KYC
  const kyc = await Kyc.findOneAndUpdate(
    { userId },
    { selfieUrl },
    { new: true, upsert: true }
  );

  profile.isKycVerified = true;
  await profile.save();
  // Mark user as verified (KYC completed)
  // user.isKycVerified = true;
  // await user.save();

  return kyc;
};

module.exports.getKyc = async (userId) => {
  const kyc = await Kyc.findOne({ userId });
  if (!kyc) throw new Error("No KYC found");
  return kyc;
};
