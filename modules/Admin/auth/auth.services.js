const redis = require("../../../common/redis");
const utils = require("../utils");

/*------------Optional Services to Authenticate User Email Address For Login/Register---------------*/
module.exports.EmailOtpServices = async (email) => {
  const otp = utils.generateOtp();
  const redisKey = `login:${email.trim()}`;

  // Set OTP in Redis for (120 seconds)
  await redis.setex(redisKey, 300, otp);

  // console.log("Email otp: ", otp, "Email RedisKey: ", redisKey);

  // Send Email
  const subject = "Your Email verification code";
  const text = `Your email verification code from MAFS Dating App : ${otp}`;
  await utils.sendEmail(email, subject, text);
  return { ok: true };
};

module.exports.verifyEmailOTPServices = async (email, otp) => {
  const redisKey = `login:${email.trim()}`;
  const storedOtp = await redis.get(redisKey);

  if (!storedOtp) throw new Error("OTP expired or not found");
  if (storedOtp !== otp) throw new Error("Invalid OTP");

  let user = await User.findOne({ email });
  const isNewUser = !user;

  /* ------------------ Check Deactivated Account ------------------ */
  if (user && user.isActive === false) {
    const subject = "Your MAFS Account is Inactive";

    await utils.sendEmail(user.email, subject, emailTemplate(user));
    // ❗ MUST throw error
    throw new Error("Account is deactivated. Please contact support.");
  }

  if (!user) {
    user = new User({
      userName: utils.generateUsername(),
      email,
      isEmailVerified: true,
      accountType: "USER",
    });
  } else {
    user.emailOtp = storedOtp;
    // user.emailOtpExpires = undefined;
    user.isEmailVerified = true;
    user.isNewUser = false;
  }

  const accessToken = utils.generateAccessToken(user);
  const refreshTokenRaw = utils.generateRefreshToken();
  const refreshHash = utils.hashToken(refreshTokenRaw);

  // Rotation: Keep refresh tokens array manageable
  if (user.refreshTokens.length >= 5) user.refreshTokens.shift();

  user.refreshTokens.push({
    tokenHash: refreshHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  await user.save();
  await redis.del(redisKey);

  return {
    user,
    accessToken,
    refreshToken: refreshTokenRaw,
    isNewUser,
  };
};
