const logger = require("../utils/logger");
const iapConfig = require("../config/iap.config");

const verifyAppleWebhook = async (req, res, next) => {
  try {
    if (!req.body || !req.body.signedPayload) {
      logger.warn("Invalid Apple webhook - no signedPayload");
      return res.status(400).json({ error: "Invalid Apple webhook payload" });
    }

    const settings = iapConfig.getCurrentSettings();

    if (settings.skipWebhookVerification) {
      logger.debug("Skipping Apple webhook verification (dev mode)");
      return next();
    }

    try {
      const appleService = require("../services/apple.service");
      // Cache the decoded payload so the controller doesn't have to re-run
      // the same CPU-intensive JWS verification a second time.
      req.appleDecodedPayload = await appleService.verifyAndDecodeJWS(req.body.signedPayload);
      logger.info("Apple webhook signature verified");
    } catch (verifyErr) {
      logger.error("Apple webhook signature invalid:", verifyErr.message);
      return res.status(401).json({ error: "Invalid Apple webhook signature" });
    }

    next();
  } catch (err) {
    logger.error("Apple webhook auth error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const verifyGoogleWebhook = async (req, res, next) => {
  try {
    if (!req.body || !req.body.message || !req.body.message.data) {
      logger.warn("Invalid Google webhook - no message.data");
      return res.status(400).json({ error: "Invalid Google webhook payload" });
    }

    const settings = iapConfig.getCurrentSettings();

    if (settings.skipWebhookVerification) {
      logger.debug("Skipping Google webhook verification (dev mode)");
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Google webhook - no auth header");
      return res.status(401).json({ error: "No authorization token" });
    }

    try {
      const { OAuth2Client } = require("google-auth-library");
      const googleAuthClient = new OAuth2Client();
      const token = authHeader.split("Bearer ")[1];

      const ticket = await googleAuthClient.verifyIdToken({ idToken: token });
      const claim = ticket.getPayload();

      if (
        !claim ||
        !claim.email ||
        !claim.email.endsWith("gserviceaccount.com")
      ) {
        throw new Error("Invalid sender");
      }

      logger.info("Google webhook token verified");
    } catch (verifyErr) {
      logger.error("Google webhook token invalid:", verifyErr.message);
      return res.status(401).json({ error: "Invalid Google webhook token" });
    }

    next();
  } catch (err) {
    logger.error("Google webhook auth error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const verifyRevenueCatWebhook = async (req, res, next) => {
  try {
    const settings = iapConfig.getCurrentSettings();

    if (settings.skipWebhookVerification) {
      logger.debug("Skipping RevenueCat webhook verification (dev mode)");
      return next();
    }

    const authHeader = req.headers.authorization;
    const expectedToken = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;

    if (!expectedToken) {
      logger.error("REVENUECAT_WEBHOOK_AUTH_TOKEN is not defined in .env file");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // RevenueCat dashboard allows setting a custom Authorization header
    // Usually formatted as "Bearer <token>" or just the token.
    if (!authHeader || (authHeader !== expectedToken && authHeader !== `Bearer ${expectedToken}`)) {
      logger.warn("RevenueCat webhook - invalid or missing auth header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    logger.info("RevenueCat webhook token verified");
    next();
  } catch (err) {
    logger.error("RevenueCat webhook auth error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = { verifyAppleWebhook, verifyGoogleWebhook, verifyRevenueCatWebhook };
