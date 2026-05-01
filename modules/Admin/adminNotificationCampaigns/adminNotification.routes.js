const express = require("express");
const router = express.Router();
const {
  broadcastNotification,
  sendNotificationToPremiumUsers,
  createPremiumExpiryCampaign,
  sendPremiumExpiryNow,
  getNotificationHistory,
  updateNotificationSettings,
} = require("./adminNotification.controller");

const { createEmailCampaign } = require("./adminEmail.controller");

router.post("/broadcast", broadcastNotification);

router.post("/broadcastemail", createEmailCampaign);

router.post("/premium/send", sendNotificationToPremiumUsers);

router.post("/premium-expiry/send", createPremiumExpiryCampaign);

router.post("/premium-expiry/:campaignId/trigger", sendPremiumExpiryNow);

router.get("/notifications/history", getNotificationHistory);

router.patch("/update/:userId", updateNotificationSettings);

module.exports = router;
