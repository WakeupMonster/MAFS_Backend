const mongoose = require("mongoose");

const SubscriptionEventSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },
    source: {
      type: String,
      enum: ["WEBHOOK", "APP_VERIFY", "CRON", "MANUAL"],
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },
    externalEventId: {
      type: String,
      index: true,
    },
    payloadHash: {
      type: String,
      unique: true,
      sparse: true,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: Date,
    error: {
      message: String,
      stack: String,
      retryCount: { type: Number, default: 0 },
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

SubscriptionEventSchema.index({ processed: 1, receivedAt: 1 });
SubscriptionEventSchema.index({ platform: 1, eventType: 1 });

module.exports = mongoose.model("SubscriptionEvent", SubscriptionEventSchema);