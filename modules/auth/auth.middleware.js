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

    // :rocket: Redis cache — avoid hitting MongoDB on every request
    let user = null;
    const AUTH_KEY = `auth:user:${userId}`;

    if (redis) {
      try {
        const cached = await redis.get(AUTH_KEY);
        if (cached) {
          const parsedUser = JSON.parse(cached);
          // Safely Hydrate to Mongoose Document
          user = User.hydrate(parsedUser);
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

      // Cache for 30s
      if (redis) {
        try {
          await redis.set(AUTH_KEY, JSON.stringify(dbUser), { EX: AUTH_CACHE_TTL });
        } catch (e) {
          // Non-blocking — cache failure shouldn't break auth
        }
      }

      // Safely Hydrate to Mongoose Document
      user = User.hydrate(dbUser);
    }

    // 🔒 Security checks: Account Status & Restrictions
    if (user.accountStatus === "deleted") {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists",
      });
    }

    if (user.banDetails?.isBanned) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BANNED",
        message: "Your account has been banned",
        banDetails: user.banDetails?.reason,
      });
    }

    if (user.deactivationDetails?.isDeactivated) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DEACTIVATED",
        message: "Your account is deactivated",
      });
    }

    if (
      user.suspensionDetails?.isSuspended &&
      user.suspensionDetails.suspendUntil &&
      new Date(user.suspensionDetails.suspendUntil) > new Date()
    ) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "Your account is temporarily suspended",
        suspendUntil: user.suspensionDetails.suspendUntil,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};