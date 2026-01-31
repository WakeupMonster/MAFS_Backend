// const { rateLimit } = require("../../../common/middlewares/rateLimit");
// const authService = require("./auth.services");
// const User = require("../../auth/auth.model");
// const Profile = require("../../profile/profile.model");
// const utils = require("../../auth/auth.utils");
// const {
//   adminRegisterSchema,
//   adminLoginSchema,
//   adminResetPasswordSchema,
// } = require("./auth.validation");
// const redis = require("../../../config/cache");
// // const REFRESH_TOKEN_TTL_MS = Number(7 * 24 * 60 * 60 * 1000); // 7 days
// const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
// const MAX_REFRESH_TOKENS = 5; // per admin (multi-device safe)

// module.exports.adminRegister = async (req, res) => {
//   try {
//     // 1. Validate Request Body
//     const { error, value } = adminRegisterSchema.validate(req.body);
//     if (error) {
//       return res
//         .status(400)
//         .json({ success: false, message: error.details[0].message });
//     }

//     const { fullName, phone, email, password } = value;

//     // 2. Normalize: If email exists, phone is null (and vice versa)
//     const adminEmail = email || null;
//     const adminPhone = phone || null;

//     // 3. Check if admin already exists (only check fields that aren't null)
//     const query = [];
//     if (adminEmail) query.push({ email: adminEmail });
//     if (adminPhone) query.push({ phone: adminPhone });

//     const existingAdmin = await User.findOne({ $or: query });
//     if (existingAdmin) {
//       return res.status(400).json({
//         success: false,
//         message: "An account with this email or phone already exists",
//       });
//     }

//     // 4. Hash Password (Assuming your utils.passwordHashed works correctly)
//     const hashedPassword = await utils.passwordHashed(password);

//     // 5. Create Admin User (Auth Model)
//     const newAdmin = await User.create({
//       email: adminEmail,
//       phone: adminPhone,
//       password: hashedPassword,
//       role: "ADMIN",
//       isEmailVerified: !!adminEmail, // Verify automatically if provided
//       isPhoneVerified: !!adminPhone,
//       authMethod: adminEmail ? "email" : "phone",
//     });

//     // 6. Create Admin Profile (Profile Model)
//     const profile = await Profile.create({
//       userId: newAdmin._id,
//       fullName: fullName,
//       //   isMandatoryComplete: true,
//     });

//     // 7. Structure Response Data
//     const data = {
//       id: newAdmin._id,
//       profileId: profile._id,
//       fullName: profile.fullName,
//       email: newAdmin.email,
//       isEmailVerified: newAdmin.isEmailVerified,
//       phone: newAdmin.phone,
//       isPhoneVerified: newAdmin.isPhoneVerified,
//       role: newAdmin.role,
//       authMethod: newAdmin.authMethod,
//     };

//     return res.status(201).json({
//       success: true,
//       message: "Admin registered successfully",
//       data,
//     });
//   } catch (error) {
//     console.error("Error in adminRegister:", error);
//     return res
//       .status(500)
//       .json({ success: false, error: "Internal Server Error" });
//   }
// };

// module.exports.adminLogin = async (req, res) => {
//   try {
 
//     const { error, value } = adminLoginSchema.validate(req.body);
//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message.replace(/"/g, ""),
//       });
//     }

//     const { email, password } = value;

  
//     const admin = await User.findOne({
//       email,
//       role: "ADMIN",
//     }).select("+password +refreshTokens");

//     if (!admin) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid Admin Credentials" });
//     }

//     /* ------------------------------------
//      * 3️⃣ Account Status Check
//      * ---------------------------------- */
//     if (admin.accountStatus !== "active") {
//       return res.status(403).json({
//         success: false,
//         message: "Account is restricted",
//       });
//     }

//     /* ------------------------------------
//      * 4️⃣ Verify Password
//      * ---------------------------------- */
//     const isMatch = await utils.passwordCompared(password, admin.password);
//     if (!isMatch) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid Admin Credentials" });
//     }

//     /* ------------------------------------
//      * 5️⃣ Token Generation
//      * ---------------------------------- */
//     const accessToken = utils.generateAccessToken(admin);

//     const refreshTokenRaw = utils.generateRefreshToken();
//     const refreshTokenHash = utils.hashToken(refreshTokenRaw);

//     const now = Date.now();

//     /* ------------------------------------
//      * 6️⃣ Refresh Token Rotation
//      * ---------------------------------- */
//     admin.refreshTokens = admin.refreshTokens
//       // remove expired
//       .filter((t) => t.expiresAt > now)
//       // keep last N tokens only
//       .slice(-MAX_REFRESH_TOKENS + 1);

//     admin.refreshTokens.push({
//       tokenHash: refreshTokenHash,
//       expiresAt: now + REFRESH_TOKEN_TTL_MS,
//     });

//     await admin.save();

//     /* ------------------------------------
//      * 7️⃣ Fetch Profile (lean & minimal)
//      * ---------------------------------- */
//     const profile = await Profile.findOne({ userId: admin._id })
//       .select("fullName photos")
//       .lean();

//     const avatar = profile?.photos?.find((p) => p.isPrimary)?.url || null;

//     /* ------------------------------------
//      * 8️⃣ Response
//      * ---------------------------------- */
//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       data: {
//         id: admin._id,
//         profileId: profile?._id || null,
//         fullName: profile?.fullName || null,
//         email: admin.email,
//         phone: admin.phone,
//         role: admin.role,
//         avatar,
//         auth: {
//           accessToken,
//           refreshToken: refreshTokenRaw, // only sent once
//           tokenType: "Bearer",
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Admin Login Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// /*==================================================
//   POST API 1: REQUEST to Send OTP on Email Id
// ===================================================*/
// module.exports.sendEmailOTP = async (req, res) => {
//   try {
//     const { email } = req.body;

//     /*======================= Validation =============================*/
//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         message: "Email address is required",
//       });
//     }

//     /*======================= Rate Limiting (IP + Email) =============================*/
//     const ip = req.ip;
//     const isIpLimited = await rateLimit(`otp-email-ip:${ip}`, 3, 60);
//     const isEmailLimited = await rateLimit(`otp-email-addr:${email}`, 2, 60);

//     if (isIpLimited || isEmailLimited) {
//       return res.status(429).json({
//         success: false,
//         message: "Too many attempts. Please wait 60 seconds.",
//       });
//     }

//     /*======================= Trigger Service =============================*/
//     await authService.EmailOtpServices(email);

//     /*======================= Proper Response =============================*/
//     return res.status(200).json({
//       success: true,
//       message: "OTP sent successfully to your email",
//       screen: "verify-otp",
//       data: {
//         email: email,
//         resendAfter: 60, // Seconds until frontend enables resend button
//         expiresIn: "5m", // Informative for the user UI
//       },
//     });
//   } catch (err) {
//     console.error("Email OTP Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: `Failed to send email OTP: ${err.message}`,
//     });
//   }
// };

// /*==================================================
//   POST API 2: Verify Email OTP 
// ===================================================*/
// module.exports.verifyEmailOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (!email || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and OTP are required",
//       });
//     }

//     const redisKey = `login:${email.trim()}`;
//     const savedOtp = await redis.get(redisKey);

//     if (!savedOtp) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired or invalid",
//       });
//     }

//     if (savedOtp !== otp) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     // ✅ OTP verified → mark email verified
//     await redis.setex(`otp:email:verified:${email}`, 600, "true"); // 10 min
//     await redis.del(redisKey); // 🔥 One-time OTP

//     return res.status(200).json({
//       success: true,
//       screen: "forgot-password",
//       message: "OTP verified successfully",
//     });
//   } catch (err) {
//     console.error("Verify Email OTP Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to verify OTP",
//     });
//   }
// };

// /*==================================================
//   POST API 3: ADMIN Forget Password
// ===================================================*/
// module.exports.adminForgotPassword = async (req, res) => {
//   try {
//     const { email, newPassword } = req.body;

//     if (!email || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and new password are required",
//       });
//     }

//     // 🔐 Check OTP verification
//     const isVerified = await redis.get(`otp:email:verified:${email}`);

//     if (!isVerified) {
//       return res.status(403).json({
//         success: false,
//         message: "OTP verification required",
//       });
//     }

//     const admin = await User.findOne({
//       email,
//       role: "ADMIN",
//     }).select("+password");

//     if (!admin) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not found",
//       });
//     }

//     // 🔒 Update password
//     admin.password = await utils.passwordHashed(newPassword);

//     // 🔁 Invalidate all sessions
//     admin.refreshTokens = [];

//     await admin.save();

//     await redis.del(`otp:email:verified:${email}`);

//     return res.status(200).json({
//       success: true,
//       screen: "login",
//       message: "Password reset successfully. Please login again.",
//     });
//   } catch (err) {
//     console.error("Admin Forgot Password Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while resetting password",
//     });
//   }
// };

// /*==================================================
//   POST API 4: Reset Password. When admin already authenticate
// ===================================================*/
// module.exports.adminResetPassword = async (req, res) => {
//   try {
//     const adminId = req.user.id; // from auth middleware

//     const { error, value } = adminResetPasswordSchema.validate(req.body, {
//       abortEarly: false,
//     });

//     if (error) {
//       return res.status(400).json({
//         success: false,
//         errors: error.details.map((e) => e.message.replace(/"/g, "")),
//       });
//     }

//     if (value.currentPassword === value.newPassword) {
//       res.status(400).json({
//         success: false,
//         message: "New password must be different from current password",
//       });
//     }

//     const admin = await User.findOne({
//       _id: adminId,
//       role: "ADMIN",
//     }).select("+password +refreshTokens");

//     if (!admin) {
//       res.status(404).json({
//         success: false,
//         message: "Admin not found",
//       });
//     }

//     //  Verify current password
//     const isMatch = await utils.passwordCompared(
//       value.currentPassword,
//       admin.password
//     );

//     if (!isMatch) {
//       res.status(401).json({
//         success: false,
//         message: "Current password is incorrect",
//       });
//     }

//     // 🔒 Hash & update password
//     admin.password = await utils.passwordHashed(value.newPassword);

//     // 🔁 Invalidate all sessions
//     admin.refreshTokens = [];

//     await admin.save();

//     return res.status(200).json({
//       success: true,
//       message: "Password updated successfully. Please login again.",
//     });
//   } catch (error) {
//     console.error("Admin Reset Password Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal Server Error",
//     });
//   }
// };



const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const utils = require("../../auth/auth.utils");
const redis = require("../../../config/cache");
const AppError = require("../../../common/errors/ApiError");
const {
  adminRegisterSchema,
  adminLoginSchema,
  adminResetPasswordSchema
} = require("./auth.validation");

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REFRESH_TOKENS = 5;
const ADMIN_EMAIL_OTP_TTL = 300; // 5 min


exports.adminRegister = async (req, res, next) => {
  try {
    const { error, value } = adminRegisterSchema.validate(req.body);
    if (error) {
      throw new AppError(
        "VALIDATION_ERROR",
        error.details[0].message,
        400
      );
    }

    const { fullName, phone, email, password } = value;

    const exists = await User.findOne({
      $or: [{ email }, { phone }],
      role: "ADMIN"
    });

    if (exists) {
      throw new AppError(
        "ADMIN_EXISTS",
        "Admin with this email or phone already exists",
        400
      );
    }

    const hashedPassword = await utils.passwordHashed(password);

    const admin = await User.create({
      email: email || null,
      phone: phone || null,
      password: hashedPassword,
      role: "ADMIN",
      authMethod: email ? "email" : "phone",
      isEmailVerified: !!email,
      isPhoneVerified: !!phone
    });

    await Profile.create({
      userId: admin._id,
      fullName
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully"
    });
  } catch (err) {
    next(err);
  }
};


// exports.adminLogin = async (req, res, next) => {
//   try {
//     const { error, value } = adminLoginSchema.validate(req.body);
//     if (error) {
//       throw new AppError(
//         "VALIDATION_ERROR",
//         error.details[0].message,
//         400
//       );
//     }

//     const { email, password } = value;

//     const admin = await User.findOne({
//       email,
//       role: "ADMIN"
//     }).select("+password +refreshTokens");

//     if (!admin) {
//       throw new AppError(
//         "INVALID_CREDENTIALS",
//         "Invalid admin credentials",
//         401
//       );
//     }

//     if (admin.accountStatus !== "active") {
//       throw new AppError(
//         "ACCOUNT_RESTRICTED",
//         "Account is restricted",
//         403
//       );
//     }

//     const isMatch = await utils.passwordCompared(password, admin.password);
//     if (!isMatch) {
//       throw new AppError(
//         "INVALID_CREDENTIALS",
//         "Invalid admin credentials",
//         401
//       );
//     }

//     const accessToken = utils.generateAccessToken(admin);
//     const refreshTokenRaw = utils.generateRefreshToken();
//     const refreshTokenHash = utils.hashToken(refreshTokenRaw);
//     const now = Date.now();

//     admin.refreshTokens = admin.refreshTokens
//       .filter(t => t.expiresAt > now)
//       .slice(-MAX_REFRESH_TOKENS + 1);

//     admin.refreshTokens.push({
//       tokenHash: refreshTokenHash,
//       expiresAt: now + REFRESH_TOKEN_TTL_MS
//     });

//     await admin.save();

//     res.json({
//       success: true,
//       data: {
//         accessToken,
//         refreshToken: refreshTokenRaw
//       }
//     });
//   } catch (err) {
//     next(err);
//   }
// };



module.exports.adminLogin = async (req, res, next) => {
  try {
    const { error, value } = adminLoginSchema.validate(req.body);
    if (error) {
      throw new AppError("VALIDATION_ERROR", error.details[0].message, 400);
    }

    const { email, password } = value;

    const admin = await User.findOne({
      email,
      role: "ADMIN",
    }).select("+password +refreshTokens");

    if (!admin) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid admin credentials",
        401
      );
    }

    if (admin.accountStatus !== "active") {
      throw new AppError("ACCOUNT_RESTRICTED", "Account is restricted", 403);
    }

    const isMatch = await utils.passwordCompared(password, admin.password);
    if (!isMatch) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid admin credentials",
        401
      );
    }

    const accessToken = utils.generateAccessToken(admin);
    const refreshTokenRaw = utils.generateRefreshToken();
    const refreshTokenHash = utils.hashToken(refreshTokenRaw);
    const now = Date.now();

    admin.refreshTokens = admin.refreshTokens
      .filter((t) => t.expiresAt > now)
      .slice(-MAX_REFRESH_TOKENS + 1);

    admin.refreshTokens.push({
      tokenHash: refreshTokenHash,
      expiresAt: now + REFRESH_TOKEN_TTL_MS,
    });

    await admin.save();

    /* ------------------------------------
     * 7️⃣ Fetch Profile (lean & minimal)
     * ---------------------------------- */
    const profile = await Profile.findOne({ userId: admin._id })
      .select("nickname photos")
      .lean();

    res.json({
      success: true,
      message: "Login successful",
      screen: "/admin/dashboard",
      // data: {
      //   accessToken,
      //   refreshToken: refreshTokenRaw
      // }
      data: {
        id: admin._id,
        profileId: profile?._id || null,
        nickname: profile?.nickname || null,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        auth: {
          accessToken,
          refreshToken: refreshTokenRaw, // only sent once
          tokenType: "Bearer",
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailPassOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError(
        "EMAIL_REQUIRED",
        "Email is required",
        400
      );
    }

    const admin = await User.findOne({
      email,
      role: "ADMIN"
    });

    if (!admin) {
      throw new AppError(
        "ADMIN_NOT_FOUND",
        "Admin not found",
        404
      );
    }

    const otp = utils.generateOtp();
    const otpHash = await utils.hashOtp(otp);

    const redisKey = `admin:email:otp:${admin._id}`;
    await redis.set(redisKey, otpHash, { EX: ADMIN_EMAIL_OTP_TTL });

    await utils.sendEmail(
      email,
      "Admin Password Reset OTP",
      `<b>Your OTP is ${otp}</b>`
    );

    res.json({
      success: true,
      screen: "verify-otp",
      message: "OTP sent to admin email"
    });
  } catch (err) {
    next(err);
  }
};

exports.adminForgotPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError(
        "INVALID_REQUEST",
        "Email, OTP and new password are required",
        400
      );
    }

    const admin = await User.findOne({
      email,
      role: "ADMIN"
    }).select("+password +refreshTokens");

    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }

    const redisKey = `admin:email:otp:${admin._id}`;
    const storedHash = await redis.get(redisKey);

    if (!storedHash) {
      throw new AppError("OTP_EXPIRED", "OTP expired or invalid", 400);
    }

    const isValid = await utils.verifyOtpHash(otp, storedHash);
    if (!isValid) {
      throw new AppError("INVALID_OTP", "Invalid OTP", 401);
    }

    admin.password = await utils.passwordHashed(newPassword);
    admin.refreshTokens = [];

    await admin.save();
    await redis.del(redisKey);

    res.json({
      success: true,
      screen: "login",
      message: "Password reset successful"
    });
  } catch (err) {
    next(err);
  }
};

exports.adminResetPassword = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const { error, value } = adminResetPasswordSchema.validate(req.body);
    if (error) {
      throw new AppError(
        "VALIDATION_ERROR",
        error.details[0].message,
        400
      );
    }

    const admin = await User.findOne({
      _id: adminId,
      role: "ADMIN"
    }).select("+password +refreshTokens");

    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }

    const isMatch = await utils.passwordCompared(
      value.currentPassword,
      admin.password
    );

    if (!isMatch) {
      throw new AppError(
        "INVALID_PASSWORD",
        "Current password is incorrect",
        401
      );
    }

    admin.password = await utils.passwordHashed(value.newPassword);
    admin.refreshTokens = [];

    await admin.save();

    res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    next(err);
  }
};




const PROFILE_EMAIL_OTP_TTL = 300; // 5 minutes

/**
 * Get Admin Profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const admin = await User.findOne({
      _id: adminId,
      role: "ADMIN"
    }).select("email phone role accountStatus isEmailVerified isPhoneVerified createdAt lastLoginAt");

    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }

    const profile = await Profile.findOne({ userId: adminId })
      .select("fullName nickname photos")
      .lean();

    return res.json({
      success: true,
      data: {
        id: admin._id,
        profileId: profile?._id || null,
        fullName: profile?.fullName || "",
        nickname: profile?.nickname || "",
        email: admin.email || "",
        phone: admin.phone || "",
        role: admin.role,
        accountStatus: admin.accountStatus,
        isEmailVerified: admin.isEmailVerified,
        isPhoneVerified: admin.isPhoneVerified,
        photos: profile?.photos || [],
        createdAt: admin.createdAt,
        lastLoginAt: admin.lastLoginAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Admin Name
 */
exports.updateName = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    console.log(adminId,"adminId")
    const { fullName } = req.body;

    // Validation
    if (!fullName || !fullName.trim()) {
      throw new AppError(
        "NAME_REQUIRED",
        "Full name is required",
        400
      );
    }

    if (fullName.trim().length < 2) {
      throw new AppError(
        "NAME_TOO_SHORT",
        "Name must be at least 2 characters long",
        400
      );
    }

    if (fullName.trim().length > 100) {
      throw new AppError(
        "NAME_TOO_LONG",
        "Name must not exceed 100 characters",
        400
      );
    }

    // Name pattern validation (letters, spaces, hyphens, apostrophes only)
    const namePattern = /^[a-zA-Z\s'-]+$/;
    if (!namePattern.test(fullName.trim())) {
      throw new AppError(
        "INVALID_NAME_FORMAT",
        "Name can only contain letters, spaces, hyphens, and apostrophes",
        400
      );
    }

    // Check if admin exists
    const admin = await User.findOne({
      _id: adminId,
      role: "ADMIN"
    });

    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }

    // Update or create profile
    let profile = await Profile.findOne({ userId: adminId });

    if (!profile) {
      profile = await Profile.create({
        userId: adminId,
        fullName: fullName.trim()
      });
    } else {
      profile.fullName = fullName.trim();
      await profile.save();
    }

    return res.json({
      success: true,
      message: "Name updated successfully",
      data: {
        fullName: profile.fullName,
        nickname: profile.nickname,
        email: admin.email
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Send OTP to New Email for Verification
 */
exports.sendEmailOTP = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { email } = req.body;

    // Validation
    if (!email || !email.trim()) {
      throw new AppError(
        "EMAIL_REQUIRED",
        "Email is required",
        400
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new AppError(
        "INVALID_EMAIL",
        "Please enter a valid email address",
        400
      );
    }

    // Check if admin exists
    const admin = await User.findOne({
      _id: adminId,
      role: "ADMIN"
    });

    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }

    // Check if email already exists (for another user)
    const emailExists = await User.findOne({
      email: email.trim(),
      _id: { $ne: adminId }
    });

    if (emailExists) {
      throw new AppError(
        "EMAIL_EXISTS",
        "This email is already registered with another account",
        400
      );
    }

    // Generate OTP
    const otp = utils.generateOtp();
    const otpHash = await utils.hashOtp(otp);

    // Store OTP in Redis with email
    const redisKey = `admin:profile:email:otp:${adminId}`;
    const otpData = JSON.stringify({
      otpHash,
      email: email.trim()
    });
    
    await redis.set(redisKey, otpData, { EX: PROFILE_EMAIL_OTP_TTL });

    // Send OTP via email
    await utils.sendEmail(
      email.trim(),
      "Verify Your New Email Address",
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #4F46E5;">Email Verification</h2>
        <p>Hello Admin,</p>
        <p>You have requested to update your email address. Please use the following OTP to verify your new email:</p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h1 style="color: #4F46E5; text-align: center; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #6B7280;">This OTP will expire in 5 minutes.</p>
        <p style="color: #6B7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>`
    );

    return res.json({
      success: true,
      message: "OTP sent to your new email address",
      data: {
        email: email.trim(),
        expiresIn: PROFILE_EMAIL_OTP_TTL
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify OTP and Update Email
 */
exports.verifyEmailOTP = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { otp } = req.body;

    // Validation
    if (!otp || !otp.trim()) {
      throw new AppError(
        "OTP_REQUIRED",
        "OTP is required",
        400
      );
    }

    if (otp.trim().length !== 6) {
      throw new AppError(
        "INVALID_OTP_FORMAT",
        "OTP must be 6 digits",
        400
      );
    }

    // Get OTP data from Redis
    const redisKey = `admin:profile:email:otp:${adminId}`;
    const otpDataString = await redis.get(redisKey);

    if (!otpDataString) {
      throw new AppError(
        "OTP_EXPIRED",
        "OTP has expired or is invalid. Please request a new one.",
        400
      );
    }

    const otpData = JSON.parse(otpDataString);

    // Verify OTP
    const isValid = await utils.verifyOtpHash(otp.trim(), otpData.otpHash);

    if (!isValid) {
      throw new AppError(
        "INVALID_OTP",
        "Invalid OTP. Please try again.",
        401
      );
    }

    // Check if admin exists
    const admin = await User.findOne({
      _id: adminId,
      role: "ADMIN"
    });

    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }

    // Double-check email doesn't exist for another user
    const emailExists = await User.findOne({
      email: otpData.email,
      _id: { $ne: adminId }
    });

    if (emailExists) {
      throw new AppError(
        "EMAIL_EXISTS",
        "This email is already registered with another account",
        400
      );
    }

    // Update email
    admin.email = otpData.email;
    admin.isEmailVerified = true;
    await admin.save();

    // Delete OTP from Redis
    await redis.del(redisKey);

    // Get updated profile
    const profile = await Profile.findOne({ userId: adminId })
      .select("fullName nickname")
      .lean();

    return res.json({
      success: true,
      message: "Email updated successfully",
      data: {
        email: admin.email,
        fullName: profile?.fullName || "",
        nickname: profile?.nickname || "",
        isEmailVerified: admin.isEmailVerified
      }
    });
  } catch (err) {
    next(err);
  }
};