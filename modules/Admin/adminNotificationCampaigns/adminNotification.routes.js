const express = require("express");
const router = express.Router();
const {
  broadcastNotification,
  sendNotificationToPremiumUsers,
  createPremiumExpiryCampaign,
  sendPremiumExpiryNow,
  getNotificationHistory,
  updateNotificationSettings,
  sendIndividualNotification,
} = require("./adminNotification.controller");

const {
  createEmailCampaign,
  getEmailCampaignLogs,
} = require("./adminEmail.controller");

router.get("/email-campaign/:campaignId/logs", getEmailCampaignLogs);

router.post("/broadcast", broadcastNotification);

router.post("/broadcastemail", createEmailCampaign);

router.post("/premium/send", sendNotificationToPremiumUsers);

// compare this one and
router.post("/individual", sendIndividualNotification);

router.post("/premium-expiry/send", createPremiumExpiryCampaign);

router.post("/premium-expiry/:campaignId/trigger", sendPremiumExpiryNow);

router.get("/notifications/history", getNotificationHistory);

// this one
router.post("/send-single", sendSingleUserNotification);

router.patch("/update/:userId", updateNotificationSettings);

module.exports = router;
