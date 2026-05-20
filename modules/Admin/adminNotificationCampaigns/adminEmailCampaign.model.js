const mongoose = require("mongoose");

const AdminEmailCampaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true }, // HTML / text
    target: {
      type: String,
      enum: ["all", "free", "premium", "premium_expiry", "ghosted"],
      required: true
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued"
    },
    totalUsers: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    lastProcessedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AdminEmailCampaign",
  AdminEmailCampaignSchema
);