const redis = require("../../../common/redis");
const utils = require("../../auth/auth.utils");
const {
  forgotPasswordEmailTemplate,
} = require("../../../common/utils/forgotPasswordEmailTemplate");

/*------------Optional Services to Authenticate User Email Address For Login/Register---------------*/
module.exports.EmailOtpServices = async (email) => {
  const otp = utils.generateOtp();
  const redisKey = `login:${email.trim()}`;

  // Set OTP in Redis for (120 seconds)
  await redis.setex(redisKey, 300, otp);

  // console.log("Email otp: ", otp, "Email RedisKey: ", redisKey);

  // Send Email
  const subject = "Password Reset Verification Code";
  const html = forgotPasswordEmailTemplate(otp);

  await utils.sendEmail(email, subject, html);
  return { ok: true };
};

module.exports.adminResetPassword = async (
  adminId,
  currentPassword,
  newPassword
) => {
  try {
    if (!currentPassword || !newPassword) {
      throw {
        statusCode: 400,
        message: "Current password and new password are required",
      };
    }

    if (currentPassword === newPassword) {
      throw {
        statusCode: 400,
        message: "New password must be different from current password",
      };
    }

    const admin = await User.findOne({
      _id: adminId,
      role: "ADMIN",
    }).select("+password +refreshTokens");

    if (!admin) {
      throw {
        statusCode: 404,
        message: "Admin not found",
      };
    }

    // 🔐 Verify current password
    const isMatch = await utils.passwordCompared(
      currentPassword,
      admin.password
    );

    if (!isMatch) {
      throw {
        statusCode: 401,
        message: "Current password is incorrect",
      };
    }

    // 🔒 Hash & update password
    admin.password = await utils.passwordHashed(newPassword);

    // 🔁 Invalidate all sessions
    admin.refreshTokens = [];

    await admin.save();

    return true;
  } catch (error) {}
};
