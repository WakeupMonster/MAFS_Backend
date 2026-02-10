const mongoose = require("mongoose")
const SubscriptionTransactionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,        // ← CHANGE: Required hona chahiye
      index: true,
    },

    userId: {                // ← ADD: Direct user lookup ke liye
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },

    transactionId: {
      type: String,
      index: true,           // ← ADD: Index for lookup
      sparse: true,
    },

    purchaseToken: {
      type: String,
      sparse: true,
    },

    // ← ADD: Google Order ID
    orderId: String,

    productId: {
      type: String,
      required: true,        // ← CHANGE: Required
    },

    eventType: {
      type: String,
      enum: [
        "PURCHASE",
        "RENEW",
        "CANCEL",
        "REFUND",
        "EXPIRE",
        "GRACE_PERIOD",      // ← ADD
        "PAUSE",             // ← ADD: Google
        "RESUME",            // ← ADD: Google
        "PRICE_CHANGE",      // ← ADD
        "BILLING_RETRY",     // ← ADD
        "REVOKE",            // ← ADD
      ],
      required: true,
    },

    amount: Number,
    currency: String,

    // ← ADD: Refund specific
    refundReason: String,
    refundAmount: Number,

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },

    occurredAt: {
      type: Date,
      required: true,        // ← CHANGE: Required
    },

    // ← ADD: Idempotency check
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

// ← ADD: Compound index
SubscriptionTransactionSchema.index({ subscriptionId: 1, eventType: 1 });
SubscriptionTransactionSchema.index({ transactionId: 1, platform: 1 });