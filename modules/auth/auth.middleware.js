const jwt = require("jsonwebtoken");
const User = require("../auth/auth.model");
const redis = require("../../config/cache");

const AUTH_CACHE_TTL = 30; // 30 seconds — short enough to catch bans/deletes quickly

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 🚀 Redis cache — avoid hitting MongoDB on every request
    let user = null;
    const AUTH_KEY = `auth:user:${userId}`;

    if (redis) {
      try {
        const cached = await redis.get(AUTH_KEY);
        if (cached) {
          user = JSON.parse(cached);
          // Attach _id as ObjectId for downstream compatibility
          const mongoose = require("mongoose");
          user._id = new mongoose.Types.ObjectId(user._id);
        }
      } catch (e) {
        // Redis error — fall through to DB
      }
    }

    // Cache miss — fetch from DB
    if (!user) {
      const dbUser = await User.findById(userId).lean();
      if (!dbUser) {
        return res.status(401).json({ message: "Invalid token user not found" });
      }
      user = dbUser;

      // Cache for 30s
      if (redis) {
        try {
          await redis.set(AUTH_KEY, JSON.stringify(dbUser), { EX: AUTH_CACHE_TTL });
        } catch (e) {
          // Non-blocking — cache failure shouldn't break auth
        }
      }
    }

    req.user = user;
    next();

    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};