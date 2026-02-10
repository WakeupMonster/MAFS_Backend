const express = require("express");
const router = express.Router();
const { verifyPurchase, getStatus, getHistory, getSubscription } = require("../controllers/subscription.controller");
const { apiLimiter } = require("../middlewares/rateLimiter.middleware");
const { validate, verifyPurchaseSchema } = require("../validators/subscription.validator");

// NOTE: 'protect' middleware tumhara existing auth middleware hai
// Agar nahi hai toh neeche wala dummy use karo testing ke liye
const protect = (req, res, next) => {
  // Tumhara existing JWT auth middleware yaha import karo
  // const { protect } = require("../middlewares/auth.middleware");
  // Abhi testing ke liye dummy user set kar rahe hain

  try {
    const jwt = require("jsonwebtoken");
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id || decoded._id || decoded.userId };
    next();
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

router.post("/verify", apiLimiter, protect, validate(verifyPurchaseSchema), verifyPurchase);
router.get("/status", apiLimiter, protect, getStatus);
router.get("/history", apiLimiter, protect, getHistory);
router.get("/details", apiLimiter, protect, getSubscription);

module.exports = router;