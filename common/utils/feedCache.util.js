// // module.exports.invalidateUserFeedCache = async (redis, userId) => {
// //   if (!redis) return;

// //   const key = `feed:${userId.toString()}`;
// //   await redis.del(key);

// //   console.log("🧹 FEED CACHE CLEARED:", key);
// // };


// const redis = require("../../config/cache");

// module.exports.invalidateUserFeedCache = async (userId) => {
//   if (!redis || !redis.isOpen) return;

//   const key = `feed:${userId.toString()}`;
//   await redis.del(key);

//   console.log("🧹 FEED CACHE CLEARED:", key);
// };



const redis = require("../../config/cache");

/**
 * Invalidate a specific user's feed cache
 * Used for deactivate/reactivate
 */
module.exports.invalidateUserFeedCache = async (userId) => {
  if (!redis || !redis.redisClient || !redis.redisClient.isOpen || !userId) return;

  const key = `feed:${userId.toString()}`;
  await redis.del(key);
  console.log("🧹 FEED CACHE CLEARED:", key);
};