// src/modules/kyc/kyc.controller.js

const kycService = require("./kyc.service");

module.exports.submitKyc = async (req, res) => {
  try {
    const { userId, selfieUrl } = req.body;

    const kyc = await kycService.createOrUpdateKyc(userId, selfieUrl);

    return res.json({
      success: true,
      message: "KYC submitted successfully",
      data: kyc
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
