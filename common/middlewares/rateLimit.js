const redis = require("../../config/cache");

async function rateLimit(key, limit, windowSeconds) {
  try {
    const count = await redis.incr(key);
    
    // Pehli baar hone pe expiry set karo
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    return count > limit;
  } catch (err) {
    console.error("Rate Limit Redis Error:", err.message);
    return false; // Error pe allow kar do taaki app na ruke
  }
}

module.exports = { rateLimit };

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