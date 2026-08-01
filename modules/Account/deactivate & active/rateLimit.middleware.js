const redis = require("../../../config/cache");

module.exports.rateLimit = (action, limit, windowSeconds) => {
  return async (req, res, next) => {
    console.log("ratemiddle");
    try {
      if (!redis || !redis.redisClient || !redis.redisClient.isOpen) {
        // Redis down → allow request (fail open)
        return next();
      }

      const userId = req.user?._id?.toString();
      if (!userId) return next();

      const key = `rate:${action}:${userId}`;

      // INCR is atomic in Redis
      const current = await redis.incr(key);

      // First hit → set expiry
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > limit) {
        return res.status(429).json({
          success: false,
          message: `Too many ${action} attempts. Please try again later.`,
        });
      }

      next();
    } catch (err) {
      console.error("Rate limit error:", err);
      // Safety: do not block user if limiter fails
      next();
    }
  };
};
