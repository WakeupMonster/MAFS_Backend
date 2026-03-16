const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const utils = require("../../auth/auth.utils");
const AppError = require("../../../common/errors/ApiError");
const {
  adminRegisterSchema,
  adminLoginSchema,
  adminResetPasswordSchema,
} = require("./auth.validation");
const authService = require("./auth.services");

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REFRESH_TOKENS = 5;
// const ADMIN_EMAIL_OTP_TTL = 300; // 5 min

/*==================================================
  POST API 1: REGISTER FOR ADMIN [Note: Provide for admin]
===================================================*/
module.exports.adminRegister = async (req, res, next) => {
  try {
    const { error, value } = adminRegisterSchema.validate(req.body);
    if (error) {
      throw new AppError("VALIDATION_ERROR", error.details[0].message, 400);
    }

    const { nickname, phone, email, password } = value;

    const exists = await User.findOne({
      $or: [{ email }, { phone }],
      role: "ADMIN",
    });

    if (exists) {
      throw new AppError(
        "ADMIN_EXISTS",
        "Admin with this email or phone already exists",
        400,
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
      isPhoneVerified: !!phone,
    });

    await Profile.create({
      userId: admin._id,
      nickname,
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
    });
  } catch (err) {
    next(err);
  }
};

/*==================================================
  POST API 2: LOGIN FOR ADMIN
===================================================*/
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
        401,
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
        401,
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

    ((admin.lastLoginAt = new Date()), // <--- Ye comma (,) yahan galat hai.
      await admin.save());

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
          expiresIn: REFRESH_TOKEN_TTL_MS,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/*==================================================
  POST API 3: REQUEST to Send OTP on Email Id
===================================================*/
module.exports.sendEmailOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError("EMAIL_REQUIRED", "Email is required", 400);

    // Call service to handle DB and Redis logic
    const otp = await authService.initiateAdminPasswordReset(email);

    if (!otp) {
      // We use a generic message to prevent "Email Harvesting" (Security Best Practice)
      throw new AppError(
        "ADMIN_NOT_FOUND",
        "If an account exists, an OTP has been sent.",
        404,
      );
    }

    /**
     * OPTIMIZATION: Do NOT 'await' the email.
     * Let it run in the background. The user gets their response immediately,
     * while the server handles the SMTP handshake in parallel.
     */
    utils
      .sendEmail(email, "Admin Password Reset OTP", `Your OTP is ${otp}`)
      .catch((err) => console.error("Background Email Error:", err));

    // Instant Response
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      screen: "verify-email",
      data: {
        email: email,
        resendAfter: 60,
      },
    });
  } catch (err) {
    next(err);
  }
};

/*==================================================
  POST API 4: Verify Email OTP 
===================================================*/
module.exports.verifyEmailOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError("VALIDATION_ERROR", "Email and OTP are required", 400);
    }

    // Delegate to service
    const result = await authService.verifyAdminOTP(email.trim(), otp);

    if (!result.valid) {
      const errorMap = {
        ADMIN_NOT_FOUND: { msg: "Admin not found", code: 404 },
        OTP_EXPIRED: { msg: "OTP expired or invalid", code: 400 },
        INVALID_OTP: { msg: "The OTP entered is incorrect", code: 401 },
      };
      const error = errorMap[result.message];
      throw new AppError(result.message, error.msg, error.code);
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      screen: "new-password",
      data: {
        // Pass the adminId or a temporary reset token if needed
        resetId: result.adminId,
      },
    });
  } catch (err) {
    next(err); // Centralized error handler handles the rest
  }
};

/*==================================================
  POST API 5: ADMIN Forget Password
===================================================*/
module.exports.adminForgotPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    // We no longer need 'otp' here if it was verified in the previous step
    if (!email || !newPassword) {
      throw new AppError(
        "INVALID_REQUEST",
        "Email and new password are required",
        400,
      );
    }

    const result = await authService.resetAdminPassword(email, newPassword);

    if (!result.success) {
      const errorMap = {
        ADMIN_NOT_FOUND: { msg: "Admin not found", code: 404 },
        VERIFICATION_REQUIRED: {
          msg: "Please verify your OTP first",
          code: 403,
        },
      };
      const error = errorMap[result.message];
      throw new AppError(result.message, error.msg, error.code);
    }

    return res.status(200).json({
      success: true,
      screen: "/auth/login",
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (err) {
    next(err);
  }
};

/*==================================================
  POST API 6: Reset Password. When admin already authenticate
===================================================*/
module.exports.adminResetPassword = async (req, res, next) => {
  try {
    const adminId = req.user.id; // From auth middleware

    // 1. Validate Input (Keep Joi/Validation in controller)
    const { error, value } = adminResetPasswordSchema.validate(req.body);
    if (error) {
      throw new AppError("VALIDATION_ERROR", error.details[0].message, 400);
    }

    // 2. Call Service
    const result = await authService.updateAuthenticatedAdminPassword(
      adminId,
      value.currentPassword,
      value.newPassword,
    );

    // 3. Handle specific service errors
    if (!result.success) {
      const errorMap = {
        ADMIN_NOT_FOUND: { msg: "Admin account no longer exists", code: 404 },
        INVALID_PASSWORD: {
          msg: "The current password you entered is incorrect",
          code: 401,
        },
      };
      const error = errorMap[result.message];
      throw new AppError(result.message, error.msg, error.code);
    }

    // 4. Success Response
    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
      description: "Other sessions have been signed out.",
    });
  } catch (err) {
    next(err);
  }
};
