const mongoose = require("mongoose");

const SubscriptionTransactionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: false, // v3: Not required for consumable purchases
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "ADMIN"],
      required: true,
    },
    transactionId: {
      type: String,
      index: true,
      sparse: true,
    },
    purchaseToken: {
      type: String,
      sparse: true,
    },
    orderId: String,
    productId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        "PURCHASE",
        "CONSUMABLE_PURCHASE",
        "RENEW",
        "CANCEL",
        "REFUND",
        "EXPIRE",
        "PAUSE",
        "RESUME",
        "PRICE_CHANGE",
        "BILLING_RETRY",
        "REVOKE",
        "ADMIN_GRANT",
        "EXTENSION",
        "ADMIN_CONSUMABLE_GRANT",
      ],
      required: true,
    },
    amount: Number,
    currency: String,
    reason: String, // For admin operations (grant reason, extension reason, etc.)
    refundReason: String,
    refundAmount: Number,
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

SubscriptionTransactionSchema.index({ subscriptionId: 1, eventType: 1 });
SubscriptionTransactionSchema.index({ transactionId: 1, platform: 1 });

module.exports = mongoose.model(
  "SubscriptionTransaction",
  SubscriptionTransactionSchema
);
