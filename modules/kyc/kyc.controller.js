// src/modules/kyc/kyc.controller.js

const profileModel = require("../profile/profile.model");
const kycService = require("./kyc.service");

module.exports.submitKyc = async (req, res) => {
  try {
    const { userId, selfieUrl } = req.body;

    const kyc = await kycService.createOrUpdateKyc(userId, selfieUrl);
const profile = await profileModel.findOneAndUpdate(
  {
    userId
  },
  {
    $set : {
      "onboardingProgress.kycVerified" : true,
      "isKycVerified": true
    }
  },
   { new: true, upsert: true }
)
 if (!profile) {
      throw new Error("Failed to update profile with KYC status");
    }
    return res.json({
      success: true,
      message: "KYC submitted successfully",
      data: {
        kyc,
        profile: {
          isKycVerified: true,
          onboardingProgress: profile.onboardingProgress
        }
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.getKyc = async (req, res) => {
  try {
    const { userId } = req.params;

    const kyc = await kycService.getKyc(userId);

    return res.json({
      success: true,
      data: kyc
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
