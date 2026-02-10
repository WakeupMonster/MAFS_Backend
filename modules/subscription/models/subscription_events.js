const mongoose = require("mongoose")
const SubscriptionEventSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },

    source: {
      type: String,
      enum: ["WEBHOOK", "APP_VERIFY", "CRON", "MANUAL"],  // ← ADD: MANUAL
      required: true,
    },

    eventType: {
      type: String,
      required: true,
    },

    // ← ADD: Link back to subscription
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
      sparse: true,          // ← ADD: null values allow karo
    },

    processed: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ← ADD: Processing tracking
    processedAt: Date,

    // ← ADD: Error tracking
    error: {
      message: String,
      stack: String,
      retryCount: { type: Number, default: 0 },
    },

    // ← ADD: Raw payload store karo
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

// ← ADD: Unprocessed events quickly find karne ke liye
SubscriptionEventSchema.index({ processed: 1, receivedAt: 1 });
SubscriptionEventSchema.index({ platform: 1, eventType: 1 });