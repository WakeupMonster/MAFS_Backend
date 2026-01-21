const redis = require("../../config/cache");

async function rateLimit(key, limit, windowSeconds) {
  const results = await redis
    .multi()
    .incr(key)
    .expire(key, windowSeconds) // expire only if new key
    .exec();

  const count = results[0][1];
  return count > limit;
}
module.exports = {rateLimit};

// async function rateLimit(key, limit, windowSec) {
//   const redisKey = `rate:${key}`;

//   const current = await redis.incr(redisKey);

//   if (current === 1) {
//     await redis.expire(redisKey, windowSec);
//   }

//   if (current > limit) {
//     return false; 
//   }

//   return true;
// }

// module.exports = { rateLimit };