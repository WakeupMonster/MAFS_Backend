const jwt = require("jsonwebtoken");
const User = require("../auth/auth.model");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    const redis = require("../../../config/cache");
    let user = null;
    const authCacheKey = `auth:user:${decoded.userId}`;
    
    if (redis) {
      const cachedUser = await redis.get(authCacheKey);
      if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          user = User.hydrate(parsedUser); // Safely Hydrate to Mongoose Document
      }
    }
    
    if (!user) {
      const rawUser = await User.findById(decoded.userId).lean();
      if (rawUser) {
        if (redis) {
          await redis.set(authCacheKey, JSON.stringify(rawUser), { EX: 300 }); // 5 min TTL
        }
        user = User.hydrate(rawUser); // Ensure it's ALWAYS a Mongoose Document
      }
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid token user not found" });
    }
    // if (user.accountStatus === "deleted") {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Account no longer exists"
    //   });
    // }

    //  if (user.banDetails?.isBanned) {
    //   return res.status(403).json({
    //     success: false,
    //     code: "ACCOUNT_BANNED",
    //     banDetails: user.banDetails?.reason
    //   });
    // }

    // // 📴 DEACTIVATED
    // if (user.deactivationDetails?.isDeactivated) {
    //   return res.status(403).json({
    //     success: false,
    //     code: "ACCOUNT_DEACTIVATED"
    //   });
    // }
    req.user = user;
    next();

    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
