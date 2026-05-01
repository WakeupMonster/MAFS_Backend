const authService = require("./auth.service");
const { rateLimit } = require("../../common/middlewares/rateLimit");
const smsService = require("../../common/notification/sms.service");
const User = require("../auth/auth.model");
const otpService = require("../../common/otp/otp.service");
const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");
const AppError = require("../../common/errors/ApiError");
const { formatProfileResponse } = require("../profile/profile.formatter");
// const { buildOnboardingResponse } = require("../../common/utils/onBoardingSteps");

module.exports.sendOtp = async (req, res, next) => {
  try {
    let { phone } = req.body;

    // if (!phone) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Phone is required"
    //   });
    // }

    if (!phone) {
      throw new AppError("PHONE_REQUIRED", "Phone number is required", 400);
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }
    const phoneHash = hashPhone(normalizedPhone);

    let user = await User.findOne({ phoneHash });

    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        phoneHash,
        authMethod: "phone",
        isTest: normalizedPhone.startsWith("+1000"), // Assign test flag
      });
    }

    if (!user.phone) {
      user.phone = normalizedPhone;
    }
    if (!user.phoneHash) {
      user.phoneHash = phoneHash;
    }

    await user.save();

    const TEST_PHONE = "+61800000000";
    if (normalizedPhone === TEST_PHONE) {
      return res.json({
        success: true,
        message: "OTP sent successfully (Simulated)",
      });
    }

    await otpService.sendOtp({
      scope: "user",
      type: "sms",
      target: normalizedPhone,
      sendFn: smsService.sendSms,
      messageFn: (otp) => `Your MAFS OTP is ${otp}`,
      ttl: 300,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    // } catch (err) {
    //   console.error("sendTestOtp error:", err);
    //   return res.status(400).json({
    //     success: false,
    //     message: err.message
    //   });
    // }
    // eslint-disable-next-line no-undef
    next(err);
  }
};

module.exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    // if (!phone || !otp) {
    //   return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    // }

    if (!otp || !phone) {
      throw new AppError("OTP_REQUIRED", "Phone and OTP is required", 400);
    }
    const result = await authService.verifyPhoneOtpUnified(phone, otp, req);

    return res.json({
      success: true,
      message: result.isNewUser
        ? "Welcome! Phone verified successfully"
        : "Welcome back! Login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.verifyTestOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone and OTP are required" });
    }

    const result = await authService.verifyPhoneTestOtpUnified(phone, otp, req);

    return res.json({
      success: true,
      message: result.isNewUser
        ? "Welcome! Phone verified successfully"
        : "Welcome back! Login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.registerEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    await authService.sendEmailOtp(token, email);

    return res.json({
      success: true,
      message: "Email OTP sent successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const result = await authService.verifyEmailOtp(token, otp, req);

    // await profileModel.findOneAndUpdate(
    //   { userId: result.user._id },
    //   {
    //     $set: {
    //       "onboardingProgress.emailVerified": true,
    //     },
    //   },
    //   { upsert: true }
    // );

    return res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        // accessToken: result.accessToken,
        user: result.user, // Manager wala format yahan aa gaya
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.loginSendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const ip = req.ip?.split(":").pop() || "";

    await authService.loginSendOtp(phone, ip);

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    return res.status(429).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.loginVerify = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const { user, accessToken, refreshToken } =
      await authService.loginVerifyOtp(phone, otp);

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        userId: user._id,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.refreshToken = async (req, res) => {
  try {
    // const { refreshToken } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing in header",
      });
    }

    const refreshToken = authHeader.split(" ")[1];
    const result = await authService.refreshAccessToken(refreshToken, req);

    return res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user, // Same consistency!
      },
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message });
  }
};

module.exports.logout = async (req, res) => {
  try {
    const { refreshToken, deviceId } = req.body;

    await authService.logout(refreshToken, deviceId);

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.resendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const ip = req.ip?.split(":").pop() || "";

    // if (!phone) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Phone number is required"
    //   });
    // }

    if (!phone) {
      throw new AppError("PHONE_REQUIRED", "Phone number is required", 400);
    }

    const TEST_PHONE = "+61800000000";
    if (phone === TEST_PHONE) {
      return res.json({
        success: true,
        message: "OTP resent successfully (Simulated for Play Store)",
      });
    }

    const isLimited = await rateLimit(`resend:phone:${ip}`, 3, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many resend attempts. Please try again later.",
      });
    }

    const user = await User.findOne({ phone });
    // if (!user) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "No account found with this phone number.",
    //   });
    // }

    if (!user) {
      throw new AppError(
        "USER_NOT_FOUND",
        "No account found with this phone number.",
        404,
      );
    }

    await authService.sendPhoneOtp(phone);

    return res.json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const authHeader = req.headers.authorization;

    // 1. Token Check
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }
    const token = authHeader.split(" ")[1];

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    if (email.toLowerCase() === "test@keenasmustard.com") {
      return res.json({
        success: true,
        message:
          "Verification email resent successfully (Simulated for Play Store)",
      });
    }

    // 2. Rate limiting (Optional but good)
    const isLimited = await rateLimit(
      `resend:email:${req.ip?.split(":").pop() || ""}`,
      3,
      60,
    );
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please try again after a minute.",
      });
    }

    // 3. SERVICE CALL (Exactly like registerEmail)
    // Hum token aur email bhej rahe hain
    await authService.sendEmailOtp(token, email);

    return res.json({
      success: true,
      message: "Verification email resent successfully",
    });
  } catch (err) {
    // Agar token invalid hoga toh yahan error throw hoga
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

const Profile = require("../../modules/profile/profile.model");
const BlockedContact = require("../../modules/BlockedContact/blockedContacts.model");
const BlockedUser = require("../../modules/profile/user.block");
const UserSubscription = require("../../modules/auth/UserSubscription.model");

module.exports.sendTestOtp = async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    // normalize
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // const phoneHash = hashPhone(normalizedPhone);

    // OTP send
    const result = await authService.sendPhoneOtpTest(normalizedPhone, true);

    // ✅ USER fetch karo
    const user = await User.findOne({ phone: normalizedPhone });

    let formattedUser = null;

    if (user) {
      const userId = user._id;

      const profile = await Profile.findOne({ userId });

      const blockedContacts = await BlockedContact.find({
        userId,
      }).lean();

      const blockedUser = await BlockedUser.find({
        userId,
      }).lean();

      const subData = await UserSubscription.findOne({
        userId,
        isActive: true,
      }).lean();

      formattedUser = await formatProfileResponse(
        user,
        profile,
        blockedContacts,
        blockedUser,
        subData,
        req,
      );
    }

    return res.json({
      success: true,
      message: `Test OTP: ${result.otp}`,
      data: {
        user: formattedUser,
      },
    });
  } catch (err) {
    console.error("Error in sendTestOtp:", err);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// module.exports.sendTestOtp = async (req, res) => {
//   try {
//     let { phone } = req.body;
//     // const ip = req.ip;

//     if (!phone) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone is required"
//       });
//     }

//     // 🔹 Normalize phone (VERY IMPORTANT)
//     const normalizedPhone = normalizePhone(phone);
//     if (!normalizedPhone) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid phone number"
//       });
//     }

//     // 🔹 Hash phone (future consistency)
//     const phoneHash = hashPhone(normalizedPhone);

//     // Rate limiting
//     // const isLimited = await rateLimit(`otp:test:${ip}`, 10, 60);
//     // if (isLimited) {
//     //   return res.status(429).json({
//     //     success: false,
//     //     message: "Too many test requests. Try again later."
//     //   });
//     // }

//     // ✅ OTP send (NO DB WRITE HERE)
//     const result = await authService.sendPhoneOtpTest(normalizedPhone, true);

//     return res.json({
//       success: true,
//       message: `Test OTP: ${result.otp}`,
//         otp: result.otp,
//        user: await formatProfileResponse(user, profile, blockedContacts, blockedUser,req),
//       debug: {
//         normalizedPhone,
//         phoneHash
//       }
//     });
//   } catch (err) {
//     console.error("Error in sendTestOtp:", err);
//     return res.status(400).json({
//       success: false,
//       message: err.message
//     });
//   }
// };
