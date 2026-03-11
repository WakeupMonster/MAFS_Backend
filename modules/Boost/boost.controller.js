const redis = require("../../config/cache");
const UsageService = require("../subscription/services/usage.service");
const BOOST_TTL_SECONDS = 30 * 60; // 30 minutes

exports.activateBoost = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // 1️⃣ Check for already active boost
    const existing = await redis.get(`boost:${userId}`);
    if (existing) {
      return res.json({
        success: true,
        message: "Boost already active",
      });
    }

    // 2️⃣ Use Boost via UsageService (Quota check + Bucket logic)
    try {
      await UsageService.useItem(userId, 'BOOST');
    } catch (error) {
      if (error.message === 'LIMIT_REACHED') {
        return res.status(403).json({
          success: false,
          code: "LIMIT_REACHED",
          message: "No Boosts left! You can purchase more in the store."
        });
      }
      throw error;
    }

    // 3️⃣ Already boosted?
    // const existing = await redis.get(`boost:${userId}`);
    // if (existing) {
    //   return res.json({
    //     success: true,
    //     message: "Boost already active",
    //     // remainingSeconds: await redis.client.ttl(`boost:${userId}`)
    //   });
    // }

    // 4️⃣ Activate boost
    // await redis.set(`boost:${userId}`, 1, Number({ EX: BOOST_TTL_SECONDS }));
    await redis.set(`boost:${userId}`, "1", { EX: BOOST_TTL_SECONDS });
    console.log(`boost:${userId}`, "bosted user")

    // 5️⃣ Clear feed cache (VERY IMPORTANT)
    await redis.del(`feed:${userId}`);

    return res.json({
      success: true,
      message: "Boost activated successfully",
      boostDurationMinutes: 30
    });
  } catch (err) {
    console.error("Boost Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// module.exports.unboostUser API
module.exports.unboostUser = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // 1️⃣ Redis se boost key delete karo
    const boostKey = `boost:${userId}`;
    const result = await redis.del(boostKey);

    // 2️⃣ Feed cache delete karo taaki changes turant dikhein
    await redis.del(`feed:${userId}`);

    if (result === 0) {
      return res.json({
        success: true,
        message: "User was not boosted or boost already expired"
      });
    }

    return res.json({
      success: true,
      message: "Boost deactivated successfully"
    });
  } catch (err) {
    console.error("Unboost Error:", err);
    res.status(500).json({ success: false, message: "Failed to deactivate boost" });
  }
};