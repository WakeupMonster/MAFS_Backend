const mongoose = require("mongoose");

const AdminNotificationSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true },

    title: { type: String, required: true },
    message: { type: String, required: true },

    cta: {
      label: String,
      action: String, // OPEN_CHAT | BUY_PREMIUM | OPEN_APP
    },

    target: {
      type: String,
      enum: ["premium_users", "premium_expiry", "all_users", "free_users"],
      required: true,
    },

    channels: {
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },

    mode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
      index: true,
    },

    expiryRule: { daysBeforeExpiry: Number },

    scheduleAt: { type: Date, default: null }, // null = send now

    status: {
      type: String,
      enum: ["pending", "scheduled", "sent"],
      default: "pending",
    },

    sentCount: { type: Number, default: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AdminNotificationCampaign",
  AdminNotificationSchema
);

// {
//   "campaignName": "Premium Offer July",
//   "title": "Premium Exclusive 🎉",
//   "message": "Unlock more matches & boosts. Limited time!",
//   "cta": {
//     "label": "Buy Premium",
//     "action": "BUY_PREMIUM"
//   },
//   "sendNow": true
// }

// {
//   "campaignName": "Premium Expiry Reminder",
//   "title": "Premium Ending Soon ⏰",
//   "message": "Your premium expires in 2 days. Renew now!",
//   "cta": {
//     "label": "Renew",
//     "action": "BUY_PREMIUM"
//   },
//   "sendNow": false,
//   "scheduleAt": "2026-01-26T20:00:00.000Z"
// }

// PREMIUM EXPIRE DATA

// {
//   "campaignName": "Premium Expiry Reminder - 2 Days",
//   "title": "Premium Ending Soon ⏰",
//   "message": "Your premium expires in {{daysLeft}} days. Renew now to keep matching!",
//   "cta": {
//     "label": "Renew Premium",
//     "action": "BUY_PREMIUM"
//   },
//   "daysBeforeExpiry": 2,
//   "auto": true
// }
