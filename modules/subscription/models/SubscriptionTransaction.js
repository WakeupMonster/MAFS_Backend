const mongoose = require("mongoose");

const SubscriptionTransactionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
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
      enum: ["ios", "android"],
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
        "RENEW",
        "CANCEL",
        "REFUND",
        "EXPIRE",
        "GRACE_PERIOD",
        "PAUSE",
        "RESUME",
        "PRICE_CHANGE",
        "BILLING_RETRY",
        "REVOKE",
      ],
      required: true,
    },
    amount: Number,
    currency: String,
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

module.exports = mongoose.model("SubscriptionTransaction", SubscriptionTransactionSchema);