// middlewares/webhookAuth.middleware.js

exports.verifyAppleWebhook = (req, res, next) => {
  try {
    if (!req.body?.signedPayload) {
      return res.status(400).json({ error: "Invalid Apple webhook payload" });
    }

    // TODO: Production mein Apple JWT signature verify karo
    // Apple ki public key se
    // Abhi development mein skip kar rahe hain

    next();
  } catch (err) {
    console.error("Apple webhook auth error:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
};

exports.verifyGoogleWebhook = (req, res, next) => {
  try {
    if (!req.body?.message?.data) {
      return res.status(400).json({ error: "Invalid Google webhook payload" });
    }

    // TODO: Production mein Google Pub/Sub token verify karo
    // Bearer token check karo
    // Abhi development mein skip kar rahe hain

    next();
  } catch (err) {
    console.error("Google webhook auth error:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
};