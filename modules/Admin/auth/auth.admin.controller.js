const { rateLimit } = require("../../../common/middlewares/rateLimit");
const authService = require("./auth.services");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const utils = require("../../auth/auth.utils");
const {
  adminRegisterSchema,
  adminLoginSchema,
  adminResetPasswordSchema,
} = require("./auth.validation");
const redis = require("../../../common/redis");
// const REFRESH_TOKEN_TTL_MS = Number(7 * 24 * 60 * 60 * 1000); // 7 days
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
const MAX_REFRESH_TOKENS = 5; // per admin (multi-device safe)

// exports.adminRegister = async (req, res) => {
//   try {
//     const { fullName, phone, email, password } = req.body;

//     // 1. Check if admin already exists
//     const existingAdmin = await User.findOne({ $or: [{ email }, { phone }] });
//     if (existingAdmin)
//       return res
//         .status(400)
//         .json({ message: "Admin already exists with this email/phone" });

//     // 2. Hash Password
//     const hashedPassword = utils.passwordHashed(password);

//     // 3. Create Admin User (Auth Model)
//     const newAdmin = await User.create({
//       email,
//       phone,
//       password: hashedPassword,
//       role: "ADMIN",
//       isEmailVerified: true, // Internal admins are usually pre-verified
//       isPhoneVerified: true,
//       authMethod: email ? "email" : "phone",
//     });

//     // 4. Create Admin Profile (Profile Model)
//     const profile = await Profile.create({
//       userId: newAdmin._id,
//       fullName: fullName,
//       isMandatoryComplete: true, // Admins bypass onboarding
//     });

//     const data = {
//       id: newAdmin._id,
//       profileId: profile._id,
//       fullName: profile.fullName,
//       email: newAdmin.email,
//       phone: newAdmin.phone,
//       role: newAdmin.role,
//       isEmailVerified: newAdmin.isEmailVerified,
//       isPhoneVerified: newAdmin.isPhoneVerified,
//       authMethod: newAdmin.authMethod,
//     };

//     res
//       .status(201)
//       .json({ success: true, message: "Admin registered successfully", data });
//   } catch (error) {
//     console.log("Server error while register admin");
//     res.status(500).json({ error: error.message });
//   }
// };

module.exports.adminRegister = async (req, res) => {
  try {
    // 1. Validate Request Body
    const { error, value } = adminRegisterSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { fullName, phone, email, password } = value;

    // 2. Normalize: If email exists, phone is null (and vice versa)
    const adminEmail = email || null;
    const adminPhone = phone || null;

    // 3. Check if admin already exists (only check fields that aren't null)
    const query = [];
    if (adminEmail) query.push({ email: adminEmail });
    if (adminPhone) query.push({ phone: adminPhone });

    const existingAdmin = await User.findOne({ $or: query });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "An account with this email or phone already exists",
      });
    }

    // 4. Hash Password (Assuming your utils.passwordHashed works correctly)
    const hashedPassword = await utils.passwordHashed(password);

    // 5. Create Admin User (Auth Model)
    const newAdmin = await User.create({
      email: adminEmail,
      phone: adminPhone,
      password: hashedPassword,
      role: "ADMIN",
      isEmailVerified: !!adminEmail, // Verify automatically if provided
      isPhoneVerified: !!adminPhone,
      authMethod: adminEmail ? "email" : "phone",
    });

    // 6. Create Admin Profile (Profile Model)
    const profile = await Profile.create({
      userId: newAdmin._id,
      fullName: fullName,
      //   isMandatoryComplete: true,
    });

    // 7. Structure Response Data
    const data = {
      id: newAdmin._id,
      profileId: profile._id,
      fullName: profile.fullName,
      email: newAdmin.email,
      isEmailVerified: newAdmin.isEmailVerified,
      phone: newAdmin.phone,
      isPhoneVerified: newAdmin.isPhoneVerified,
      role: newAdmin.role,
      authMethod: newAdmin.authMethod,
    };

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data,
    });
  } catch (error) {
    console.error("Error in adminRegister:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

/*==================================================
  POST API 1: ADMIN LOGIN API.
===================================================*/
// exports.adminLogin = async (req, res) => {
//   try {
//     // Step 1: identifier admin email or phone dono se login krskta hn
//     const { identifier, password } = req.body;

//     // Step 2: Find user by email OR phone and ensure they are an ADMIN or Not
//     const admin = await User.findOne({
//       $or: [{ email: identifier }, { phone: identifier }],
//     });

//     if (!admin)
//       return res.status(401).json({ message: "Invalid Admin Credentials" });

//     // Step 3: Check Password or compare password
//     const isMatch = await bcrypt.compare(password, admin.password);

//     if (!isMatch)
//       return res.status(401).json({ message: "Invalid Admin Credentials" });

//     // 3. Generate Session
//     const accessToken = utils.generateAccessToken(admin);
//     const refreshTokenRaw = utils.generateRefreshToken();
//     const refreshTokenHash = utils.hashToken(refreshTokenRaw);

//     admin.refreshTokens.push({
//       tokenHash: refreshTokenHash,
//       expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
//     });

//     await admin.save();

//     // 4. Get Profile for Avatar/Name
//     const profile = await Profile.findOne({ userId: admin._id });

//     res.status(200).json({
//       message: "Login successful",
//       admin: {
//         id: admin._id,
//         profile: profile._id,
//         fullName: profile.fullName,
//         email: admin.email,
//         phone: admin.phone,
//       },
//       auth: {
//         accessToken: accessToken,
//         refreshToken: refreshTokenRaw,
//         tokenType: "Bearer",
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.adminLogin = async (req, res) => {
//   try {
//     // 1. Joi Validation
//     const { error, value } = adminLoginSchema.validate(req.body);
//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message.replace(/"/g, ""),
//       });
//     }

//     const { email, password } = value;

//     // 2. Find User & Verify Role
//     // We check for ADMIN role immediately to prevent regular users from hitting this logic
//     const admin = await User.findOne({ email, role: "ADMIN" });

//     if (!admin) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid Admin Credentials" });
//     }

//     // 3. Verify Account Status
//     if (admin.accountStatus !== "active") {
//       return res
//         .status(403)
//         .json({ success: false, message: "Account is restricted" });
//     }

//     // 4. Check Password
//     const isMatch = await utils.passwordCompared(password, admin.password);
//     if (!isMatch) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid Admin Credentials" });
//     }

//     // 5. Generate Session & Refresh Token
//     const accessToken = utils.generateAccessToken(admin);
//     const refreshTokenRaw = utils.generateRefreshToken();
//     const refreshTokenHash = utils.hashToken(refreshTokenRaw);

//     // Clean up expired tokens while pushing the new one
//     const now = Date.now();
//     admin.refreshTokens = admin.refreshTokens.filter((t) => t.expiresAt > now);

//     admin.refreshTokens.push({
//       tokenHash: refreshTokenHash,
//       expiresAt: now + REFRESH_TOKEN_TTL_MS,
//     });

//     await admin.save();

//     // 6. Fetch Profile (Optimized: only get necessary fields)
//     const profile = await Profile.findOne({ userId: admin._id }).select(
//       "fullName photos"
//     );

//     // 7. Success Response
//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       data: {
//         id: admin._id,
//         profileId: profile?._id,
//         fullName: profile?.fullName,
//         email: admin.email,
//         phone: admin.phone,
//         avatar: profile?.photos?.find((p) => p.isPrimary)?.url || null,
//         auth: {
//           accessToken,
//           refreshToken: refreshTokenRaw,
//           tokenType: "Bearer",
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal Server Error" });
//   }
// };

module.exports.adminLogin = async (req, res) => {
  try {
    /* ------------------------------------
     * 1️⃣ Validate Input
     * ---------------------------------- */
    const { error, value } = adminLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    const { email, password } = value;

    /* ------------------------------------
     * 2️⃣ Find Admin (role locked)
     * ---------------------------------- */
    const admin = await User.findOne({
      email,
      role: "ADMIN",
    }).select("+password +refreshTokens");

    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Admin Credentials" });
    }

    /* ------------------------------------
     * 3️⃣ Account Status Check
     * ---------------------------------- */
    if (admin.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is restricted",
      });
    }

    /* ------------------------------------
     * 4️⃣ Verify Password
     * ---------------------------------- */
    const isMatch = await utils.passwordCompared(password, admin.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Admin Credentials" });
    }

    /* ------------------------------------
     * 5️⃣ Token Generation
     * ---------------------------------- */
    const accessToken = utils.generateAccessToken(admin);

    const refreshTokenRaw = utils.generateRefreshToken();
    const refreshTokenHash = utils.hashToken(refreshTokenRaw);

    const now = Date.now();

    /* ------------------------------------
     * 6️⃣ Refresh Token Rotation
     * ---------------------------------- */
    admin.refreshTokens = admin.refreshTokens
      // remove expired
      .filter((t) => t.expiresAt > now)
      // keep last N tokens only
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
      .select("fullName photos")
      .lean();

    const avatar = profile?.photos?.find((p) => p.isPrimary)?.url || null;

    /* ------------------------------------
     * 8️⃣ Response
     * ---------------------------------- */
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: admin._id,
        profileId: profile?._id || null,
        fullName: profile?.fullName || null,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        avatar,
        auth: {
          accessToken,
          refreshToken: refreshTokenRaw, // only sent once
          tokenType: "Bearer",
        },
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/*==================================================
  POST API 2: REQUEST to Send OTP on Email Id
===================================================*/
module.exports.sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    /*======================= Validation =============================*/
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    /*======================= Rate Limiting (IP + Email) =============================*/
    const ip = req.ip;
    const isIpLimited = await rateLimit(`otp-email-ip:${ip}`, 3, 60);
    const isEmailLimited = await rateLimit(`otp-email-addr:${email}`, 2, 60);

    if (isIpLimited || isEmailLimited) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please wait 60 seconds.",
      });
    }

    /*======================= Trigger Service =============================*/
    await authService.EmailOtpServices(email);

    /*======================= Proper Response =============================*/
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      screen: "verify-otp",
      data: {
        email: email,
        resendAfter: 60, // Seconds until frontend enables resend button
        expiresIn: "5m", // Informative for the user UI
      },
    });
  } catch (err) {
    console.error("Email OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: `Failed to send email OTP: ${err.message}`,
    });
  }
};

/*==================================================
  POST API 3: Verify Email OTP 
===================================================*/
module.exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const redisKey = `login:${email.trim()}`;
    const savedOtp = await redis.get(redisKey);

    if (!savedOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or invalid",
      });
    }

    if (savedOtp !== otp) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ OTP verified → mark email verified
    await redis.setex(`otp:email:verified:${email}`, 600, "true"); // 10 min
    await redis.del(redisKey); // 🔥 One-time OTP

    return res.status(200).json({
      success: true,
      screen: "forgot-password",
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error("Verify Email OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

/*==================================================
  POST API 4: ADMIN Forget Password
===================================================*/
module.exports.adminForgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    // 🔐 Check OTP verification
    const isVerified = await redis.get(`otp:email:verified:${email}`);

    if (!isVerified) {
      return res.status(403).json({
        success: false,
        message: "OTP verification required",
      });
    }

    const admin = await User.findOne({
      email,
      role: "ADMIN",
    }).select("+password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // 🔒 Update password
    admin.password = await utils.passwordHashed(newPassword);

    // 🔁 Invalidate all sessions
    admin.refreshTokens = [];

    await admin.save();

    // 🧹 Cleanup Redis state
    await redis.del(`otp:email:verified:${email}`);

    return res.status(200).json({
      success: true,
      screen: "login",
      message: "Password reset successfully. Please login again.",
    });
  } catch (err) {
    console.error("Admin Forgot Password Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
};

/*==================================================
  POST API 5: Reset Password. When admin already authenticate
===================================================*/
module.exports.adminResetPassword = async (req, res) => {
  try {
    const adminId = req.user.id; // from auth middleware

    const { error, value } = adminResetPasswordSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map((e) => e.message.replace(/"/g, "")),
      });
    }

    if (value.currentPassword === value.newPassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    const admin = await User.findOne({
      _id: adminId,
      role: "ADMIN",
    }).select("+password +refreshTokens");

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // 🔐 Verify current password
    const isMatch = await utils.passwordCompared(
      value.currentPassword,
      admin.password
    );

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // 🔒 Hash & update password
    admin.password = await utils.passwordHashed(value.newPassword);

    // 🔁 Invalidate all sessions
    admin.refreshTokens = [];

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully. Please login again.",
    });
  } catch (error) {
    console.error("Admin Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
