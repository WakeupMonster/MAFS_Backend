// // module.exports.invalidateUserFeedCache = async (redis, userId) => {
// //   if (!redis) return;

// //   const key = `feed:${userId.toString()}`;
// //   await redis.del(key);

// //   console.log("🧹 FEED CACHE CLEARED:", key);
// // };


// const redis = require("../../config/cache");

// exports.invalidateUserFeedCache = async (userId) => {
//   if (!redis || !redis.isOpen) return;

//   const key = `feed:${userId.toString()}`;
//   await redis.del(key);

//   console.log("🧹 FEED CACHE CLEARED:", key);
// };



const redis = require("../../config/cache");

/**
 * Invalidate ALL feed caches
 * Used for deactivate/reactivate
 */
exports.invalidateUserFeedCache = async () => {
  if (!redis || !redis.isOpen) return;

  let cursor = "0";

  do {
    const reply = await redis.scan(cursor, {
      MATCH: "feed:*",
      COUNT: 100
    });

    cursor = reply.cursor;
    const keys = reply.keys;

    if (keys.length) {
      await redis.del(keys);
      console.log("🧹 FEED CACHE CLEARED:", keys.length);
    }
  } while (cursor !== "0");
};