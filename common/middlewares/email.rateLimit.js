// const redis = require("../redis");

// async function emailRateLimit(email) {
//   const key = `rl:email:${email}`;
//   const exists = await redis.get(key);

//   if (exists) {
//     throw new Error("Please wait 30 seconds before requesting new OTP");
//   }

//   // block for 30 sec
//   await redis.set(key, 1, { EX: 30 });
//   // await redis.set("test:key", 1, { EX: 10 });

// }

// module.exports = { emailRateLimit };


// src/rate-limit/emailRateLimit.js

module.exports.emailRateLimit = async function emailRateLimit(redis, email) {
  const key = `rate:email:${email}`;

  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, 60); // 1 minute window
  }

  if (attempts > 5) { 
    throw new Error("Too many email OTP requests. Try again later.");
  }
};
