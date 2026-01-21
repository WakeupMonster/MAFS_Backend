const authService = require("./auth.service");
// const redis = require("../../common/redis");
// const { smsQueue } = require("../../common/queues");
// const User = require("../auth/auth.model");
// const utils = require("../auth/auth.utils");
const { rateLimit } = require("../../common/middlewares/rateLimit");
const { normalizePhone, hashPhone } = require("../../common/utils/phone.util");

// const profileModel = require("../profile/profile.model");

/*==================================================
1. POST For Send OTP on Phone no.
===================================================*/
module.exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const ip = req.ip;
    if (!phone)
      return res
        .status(400)
        .json({ success: false, message: "Phone is required" });

    // RATE LIMIT (optional, same rehta hai)
    const isLimited = await rateLimit(`otp:${ip}`, 3, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Try again later.",
      });
    }

    // ✅ Unified OTP send (login + register dono ke liye same service)
    await authService.sendPhoneOtp(phone);

    return res.json({
      success: true,
      message: "If the number is valid, OTP has been sent.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone and OTP are required" });
    }

    const result = await authService.verifyPhoneOtpUnified(phone, otp);

    return res.json({
      success: true,
      message: result.isNewUser
        ? "Welcome! Phone verified successfully"
        : "Welcome back! Login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user, // Poora format iske andar hai
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/*==================================================
3. POST For register Email Id with token
===================================================*/
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

/*==================================================
4. POST For Verify Email with OTP
===================================================*/
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

    const result = await authService.verifyEmailOtp(token, otp);

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

/*==================================================
5. POST Login For Send OTP on Phone no.
===================================================*/
module.exports.loginSendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const ip = req.ip;

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

/*==================================================
6. POST Login For Verify OTP on through Phone no.
===================================================*/
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

/*==================================================
7. POST Referesh Token
===================================================*/
module.exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);

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

/*==================================================
8. POST For Logout API -> auth.controller.js
===================================================*/
module.exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

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

module.exports.sendTestOtp = async (req, res) => {
  try {
    let { phone } = req.body;
    const ip = req.ip;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    // 🔹 Normalize phone (VERY IMPORTANT)
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // 🔹 Hash phone (future consistency)
    const phoneHash = hashPhone(normalizedPhone);

    // Rate limiting
    const isLimited = await rateLimit(`otp:test:${ip}`, 10, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many test requests. Try again later.",
      });
    }

    // ✅ OTP send (NO DB WRITE HERE)
    const result = await authService.sendPhoneOtpTest(normalizedPhone, true);

    return res.json({
      success: true,
      message: `Test OTP: ${result.otp}`,
      otp: result.otp,

      // ⚠️ TESTING ONLY (REMOVE IN PROD RESPONSE)
      debug: {
        normalizedPhone,
        phoneHash,
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

module.exports.resendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const ip = req.ip;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Rate limiting
    const isLimited = await rateLimit(`resend:phone:${ip}`, 3, 60);
    if (isLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many resend attempts. Please try again later.",
      });
    }

    // Check if user exists
    const User = require("./auth.model");
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this phone number.",
      });
    }

    // Send OTP using the existing sendPhoneOtp function
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

/*==================================================
10. POST Resend OTP to Email
===================================================*/
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

    // 2. Rate limiting (Optional but good)
    const isLimited = await rateLimit(`resend:email:${req.ip}`, 3, 60);
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
