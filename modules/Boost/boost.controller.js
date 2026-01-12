const redis = require("../../config/cache");
const User = require("../../modules/auth/auth.model");

const BOOST_TTL_SECONDS = 30 * 60; // 30 minutes

exports.activateBoost = async (req, res) => {
  const userId = req.user._id.toString();

  // 1️⃣ User fetch
  const user = await User.findById(userId).select("isPremium").lean();
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

    // 1️⃣ Premium check
  // if (!req.user.isPremium || req.user.premiumExpiresAt < new Date()) {
  //   return res.status(403).json({
  //     success: false,
  //     message: "Premium required for boost"
  //   });
  // }

  // 2️⃣ Premium check
  if (!user.isPremium) {
    return res.status(403).json({
      success: false,
      code: "PREMIUM_REQUIRED",
      message: "Boost is available for premium users only"
    });
  }

  // 3️⃣ Already boosted?
  const existing = await redis.get(`boost:${userId}`);
  if (existing) {
    return res.json({
      success: true,
      message: "Boost already active",
      remainingSeconds: await redis.client.ttl(`boost:${userId}`)
    });
  }

  // 4️⃣ Activate boost
  await redis.set(`boost:${userId}`, 1, Number({ EX: BOOST_TTL_SECONDS }));
  console.log(`boost:${userId}`,"bosted user")

  // 5️⃣ Clear feed cache (VERY IMPORTANT)
  await redis.del(`feed:${userId}`);

  return res.json({
    success: true,
    message: "Boost activated successfully",
    boostDurationMinutes: 30
  });
};