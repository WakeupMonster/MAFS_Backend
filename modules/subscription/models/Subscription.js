const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
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
    productId: {
      type: String,
      required: true,
    },
    planType: {
      type: String,
      enum: ["weekly", "monthly", "yearly", "lifetime"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "ACTIVE",
        "GRACE",
        "EXPIRED",
        "CANCELLED",
        "PAUSED",
        "REVOKED",
        "PENDING",
      ],
      required: true,
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    gracePeriodEndsAt: Date,
    pausedAt: Date,
    resumesAt: Date,
    originalTransactionId: {
      type: String,
      index: true,
      sparse: true,
    },
    latestTransactionId: String,
    appAccountToken: String,
    purchaseToken: {
      type: String,
      index: true,
      sparse: true,
    },
    orderId: String,
    cancellationReason: {
      type: String,
      enum: [
        "USER_CANCELLED",
        "BILLING_ERROR",
        "PRICE_CHANGE",
        "PRODUCT_UNAVAILABLE",
        "REFUNDED",
        "UNKNOWN",
      ],
    },
    cancelledAt: Date,
    retryCount: {
      type: Number,
      default: 0,
    },
    previousStatus: String,
    isInFamilySharing: {
      type: Boolean,
      default: false,
    },
    offerType: {
      type: String,
      enum: ["INTRODUCTORY", "PROMOTIONAL", "OFFER_CODE", "NONE"],
      default: "NONE",
    },
    offerIdentifier: String,
    priceConsentStatus: {
      type: String,
      enum: ["AGREED", "PENDING", "DECLINED"],
    },
    environment: {
      type: String,
      enum: ["sandbox", "production"],
      required: true,
    },
    statusHistory: [
      {
        from: String,
        to: String,
        reason: String,
        changedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

SubscriptionSchema.index({ userId: 1, platform: 1, expiresAt: 1, status: 1 });

SubscriptionSchema.pre("save", function (next) {
  if (this.platform === "ios" && !this.originalTransactionId && !this.isNew) {
    return next(new Error("originalTransactionId required for iOS"));
  }
  if (this.platform === "android" && !this.purchaseToken && !this.isNew) {
    return next(new Error("purchaseToken required for Android"));
  }
  if (this.isModified("status") && !this.isNew) {
    this.statusHistory.push({
      from: this.previousStatus || "UNKNOWN",
      to: this.status,
      reason: this.cancellationReason || "system",
      changedAt: new Date(),
    });
  }
  next();
});

SubscriptionSchema.methods.isActive = function () {
  return this.status === "ACTIVE" && this.expiresAt > new Date();
};

SubscriptionSchema.methods.isInGracePeriod = function () {
  return this.status === "GRACE" && this.gracePeriodEndsAt > new Date();
};

SubscriptionSchema.methods.hasAccess = function () {
  return this.isActive() || this.isInGracePeriod();
};

SubscriptionSchema.statics.findActiveByUser = function (userId) {
  return this.findOne({
    userId,
    status: { $in: ["ACTIVE", "GRACE"] },
    expiresAt: { $gt: new Date() },
  });
};

module.exports = mongoose.model("Subscription", SubscriptionSchema);
// ← ADD: Compound indexes for common queries
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, platform: 1 });
SubscriptionSchema.index({ expiresAt: 1, status: 1 }); // Cron ke liye
