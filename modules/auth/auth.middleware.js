/* eslint-disable no-unused-vars */
// /* eslint-disable no-unused-vars */
// // src/middlewares/auth.middleware.js
// const jwt = require("jsonwebtoken");
// const User = require("../../modules/auth/auth.model");

// // Middleware: verify access token and attach user (id + role) to req.user
// module.exports = async function authMiddleware(req, res, next) {
//   try {
//     const header = req.headers.authorization;
//     if (!header || !header.startsWith("Bearer ")) {
//       return res.status(401).json({ success: false, message: "Authenticate" });
//     }

//     const token = header.split(" ")[1];
//     if (!token) return res.status(401).json({ success: false, message: "Authenticate" });

//     let payload;
//     try {
//       payload = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       return res.status(401).json({ success: false, message: "Invalid or expired token" });
//     }

//     // Optionally validate user exists in DB and is not deactivated
//     const user = await User.findById(payload.userId).select("_id role isEmailVerified isPhoneVerified");
//     if (!user) return res.status(401).json({ success: false, message: "Authenticate" });

//     // attach minimal user info for downstream handlers
//     req.user = {
//       id: user._id.toString(),
//       role: user.role,
//       isEmailVerified: user.isEmailVerified,
//       isPhoneVerified: user.isPhoneVerified
//     };

//     next();
//   } catch (err) {
//     console.error("Auth middleware error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

const jwt = require("jsonwebtoken");
const User = require("./auth.model");

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

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token user not found" });
    }
    if (user.accountStatus === "deleted") {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
