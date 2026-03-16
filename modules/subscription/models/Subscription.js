const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      // "admin_granted" is for milestone and manual grants
      enum: ["ios", "android", "admin_granted"],
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    planType: {
      type: String, // e.g. "1_MONTH", "3_MONTH", "6_MONTH" (Scalable, no enum)
      required: true,
    },
    status: {
      type: String,
      enum: [
        "ACTIVE",
        "EXPIRED",
        "CANCELLED", // Cancelled means auto-renew off, but STILL HAS ACCESS until expiresAt
        "PAUSED",
        "REVOKED",
        "PENDING",
      ],
      required: true,
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
    },
    // CURRENT PERIOD TRACKING (for AEST resets and display)
    currentPeriodStart: Date,
    currentPeriodEnd: Date,

    pausedAt: Date,
    resumesAt: Date,
    originalTransactionId: {
      type: String,
      index: true,
      sparse: true,
    },
    latestTransactionId: String,
    purchaseToken: {
      type: String,
      index: true,
      sparse: true,
    },
    orderId: String,
    cancellationReason: String,
    cancelledAt: Date,

    // Notifications tracking
    expiryNotificationSent: {
      type: Boolean,
      default: false,
    },

    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    grantReason: String, // e.g. "milestone_first_1000", "customer_service"

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

// Indexes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, expiresAt: 1 });
SubscriptionSchema.index({ expiresAt: 1, status: 1 });

SubscriptionSchema.pre("save", function (next) {
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

// V3 access logic: ACTIVE and CANCELLED both have access if not expired
SubscriptionSchema.methods.hasAccess = function () {
  const activeStatuses = ["ACTIVE", "CANCELLED"];
  return activeStatuses.includes(this.status) && this.expiresAt > new Date();
};

SubscriptionSchema.statics.findActiveByUser = function (userId) {
  return this.findOne({
    userId,
    status: { $in: ["ACTIVE", "CANCELLED"] },
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 }); // Get the one that expires furthest in the future
};

module.exports = mongoose.model("Subscription", SubscriptionSchema);
