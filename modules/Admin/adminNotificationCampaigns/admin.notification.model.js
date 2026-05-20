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
      enum: ["all", "free", "premium", "premium_expiry", "ghosted"],
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

    expiryRule: { 
      daysBeforeExpiry: Number,
      dripStages: [{
        days: Number,
        customMessage: String
      }]
    },

    scheduleAt: { type: Date, default: null }, // null = send now

    status: {
      type: String,
      enum: ["pending", "scheduled", "sent", "processing", "completed", "failed"],
      default: "pending",
    },

    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    lastRunAt: { type: Date, default: null },
    lastProcessedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

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
