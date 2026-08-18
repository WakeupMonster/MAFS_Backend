const redis = require("../../config/cache");
const utils = require("../../modules/auth/auth.utils");
const { smsQueue } = require("../queues");

const DEFAULT_TTL = 180;
const MAX_ATTEMPTS = 5;

function normalize(value) {
  return value.trim().toLowerCase();
}

function otpKey(scope, type, target) {
  return `${scope}:otp:${type}:${normalize(target)}`;
}

function attemptKey(scope, type, target) {
  return `${scope}:otp:attempts:${type}:${normalize(target)}`;
}

module.exports.sendOtp = async ({
  scope,        // "user" | "admin"
  type,         // "email" | "sms"
  target,       // email or phone
  sendFn,       // sendEmail | sendSms
  messageFn,    // template fn
  ttl = DEFAULT_TTL
}) => {
  let otp = utils.generateOtp();

  // --- AUTH TEST BYPASS GUARD ---
  const isBypassEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_TEST_BYPASS_SMS === "true";
  const isTestNumber = target.startsWith("+1000");

  if (isBypassEnabled && isTestNumber) {
    otp = "123456"; // Force hardcoded OTP specifically for load-testing the verification flow
  }
  // ------------------------------

  const hash = await utils.hashOtp(otp);
  const key = otpKey(scope, type, target);

  if (isBypassEnabled && isTestNumber) {
    // console.log(`[AUTH_TEST_BYPASS] Skipping ${type} dispatch for ${target}. OTP hash stored in Redis.`);
    await redis.set(key, hash, { EX: ttl });
    return { ok: true, isMocked: true };
  }

  try {
    await redis.set(key, hash, { EX: ttl });

    if (type === "sms") {
      // Dispatch via queue instead of an inline Twilio call so the request
      // doesn't block on Twilio's response time. The OTP hash is already
      // safely in Redis above regardless of how/when the SMS actually sends.
      await smsQueue.add("send-otp", { phone: target, message: messageFn(otp) });
    } else {
      await sendFn(target, messageFn(otp));
    }

    return { ok: true };
  } catch (err) {
    await redis.del(key);
    throw err;
  }
};

module.exports.verifyOtp = async ({ scope, type, target, otp }) => {
  const key = otpKey(scope, type, target);
  const attempts = attemptKey(scope, type, target);

  const attemptCount = Number(await redis.get(attempts)) || 0;
  if (attemptCount >= MAX_ATTEMPTS) {
    throw new Error("Too many invalid OTP attempts");
  }

  const hash = await redis.get(key);
  if (!hash) throw new Error("OTP expired or invalid");

  const valid = await utils.verifyOtpHash(otp, hash);
  if (!valid) {
    await redis.set(attempts, attemptCount + 1, { EX: 300 });
    throw new Error("Invalid OTP");
  }

  await redis.del(key);
  await redis.del(attempts);

  return { ok: true };
};