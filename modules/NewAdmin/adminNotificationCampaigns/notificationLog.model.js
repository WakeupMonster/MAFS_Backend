const mongoose = require("mongoose");

const NotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminNotificationCampaign",
      index: true,
      default: null,
    },

    title: String,
    message: String,

    type: { type: String, index: true },

    cta: { label: String, action: String },

    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
      index: true,
    },

    error: { type: String, default: null },

    sentAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationLog", NotificationLogSchema);
