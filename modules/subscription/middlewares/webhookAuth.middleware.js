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
      await appleService.verifyAndDecodeJWS(req.body.signedPayload);
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

      if (!claim || !claim.email || !claim.email.endsWith("gserviceaccount.com")) {
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

module.exports = { verifyAppleWebhook, verifyGoogleWebhook };