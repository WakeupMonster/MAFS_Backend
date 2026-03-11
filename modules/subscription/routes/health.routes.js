const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const iapConfig = require("../config/iap.config");

router.get("/", async (req, res) => {
  try {
    const SubscriptionEvent = require("../models/SubscriptionEvent");
    const Subscription = require("../models/Subscription");

    const dbState = mongoose.connection.readyState;
    const dbStatus = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

    let pendingEvents = 0;
    let failedEvents = 0;
    let activeSubscriptions = 0;

    if (dbState === 1) {
      pendingEvents = await SubscriptionEvent.countDocuments({ processed: false });
      failedEvents = await SubscriptionEvent.countDocuments({
        processed: false,
        "error.retryCount": { $gte: 5 },
      });
      activeSubscriptions = await Subscription.countDocuments({ status: "ACTIVE" });
    }

    return res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: dbStatus[dbState] || "unknown",
      iap: {
        mockMode: iapConfig.isMockMode(),
        appleConfigured: iapConfig.apple.isConfigured(),
        googleConfigured: iapConfig.google.isConfigured(),
        appleEnvironment: iapConfig.apple.environment,
        googleEnvironment: iapConfig.google.environment,
      },
      metrics: {
        pendingEvents: pendingEvents,
        failedEvents: failedEvents,
        activeSubscriptions: activeSubscriptions,
      },
      uptime: Math.floor(process.uptime()) + " seconds",
    });
  } catch (err) {
    return res.status(503).json({
      status: "ERROR",
      error: err.message,
    });
  }
});

module.exports = router;