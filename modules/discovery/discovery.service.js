const Discovery = require("./discovery.model");
const redisClient = require("../../config/cache");

// discovery preference update
exports.upsertPreference = async (userId, payload) => {
  const pref = await Discovery.findOneAndUpdate(
    { userId },
    payload,
    { upsert: true, new: true }
  );

  // 🔥 preference change hua → feed cache clear
  await redisClient.del(`feed:${userId}`);

  return pref;
};

// discovery preference get
exports.getPreference = async (userId) => {
  return Discovery.findOne({ userId }).lean();
};
