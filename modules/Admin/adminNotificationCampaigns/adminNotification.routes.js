const express = require("express");
const router = express.Router();
const adminAuth = require("../../../modules/auth/auth.middleware");

const {
  broadcastNotification,
  sendNotificationToPremiumUsers,
  createPremiumExpiryCampaign,
  getNotificationHistory
} = require("./adminNotification.controller");

const {createEmailCampaign} = require("./adminEmail.controller")

router.use(adminAuth);

router.post("/broadcast", broadcastNotification);

router.post("/broadcastemail", adminAuth, createEmailCampaign);

router.post("/premium/send", sendNotificationToPremiumUsers);

router.post("/premium-expiry/send", createPremiumExpiryCampaign);

router.get("/notifications/history", getNotificationHistory);

module.exports = router;