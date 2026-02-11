const express = require("express");
const router = express.Router();
const {
  broadcastNotification,
  sendNotificationToPremiumUsers,
  createPremiumExpiryCampaign,
  getNotificationHistory,
} = require("./adminNotification.controller");

const { createEmailCampaign } = require("./adminEmail.controller");

router.post("/broadcast", broadcastNotification);

router.post("/broadcastemail", createEmailCampaign);

router.post("/premium/send", sendNotificationToPremiumUsers);

router.post("/premium-expiry/send", createPremiumExpiryCampaign);

router.get("/notifications/history", getNotificationHistory);

module.exports = router;
