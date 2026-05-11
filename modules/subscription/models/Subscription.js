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
        "GRACE",
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

    // Tracks how the subscription was created
    source: {
      type: String,
      enum: ["STORE", "ADMIN", "GIVEAWAY", "MILESTONE", "FREE_TRIAL"],
      default: "STORE"
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
    // ➕ NAYA: Dynamic naming and tracking for Giveaways/Milestones
    customDisplayName: { type: String, default: null },
    prizeId: { type: mongoose.Schema.Types.ObjectId, ref: "GiveawayPrize", default: null },

    // ➕ Initiative 1 & 2: Billing Retry and Grace Period
    isInBillingRetry: { type: Boolean, default: false },
    isInGracePeriod: { type: Boolean, default: false },
    gracePeriodEndsAt: { type: Date, default: null },

  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

// Indexes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ userId: 1, expiresAt: 1 });
SubscriptionSchema.index({ expiresAt: 1, status: 1 });

// Added for Dashboard Performance
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ createdAt: 1 });

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
// SubscriptionSchema.methods.hasAccess = function () {
//   const activeStatuses = ["ACTIVE", "CANCELLED", "GRACE"];
//   return activeStatuses.includes(this.status) && (this.expiresAt > new Date() || this.isInGracePeriod || this.isInBillingRetry);
// };

SubscriptionSchema.statics.hasPremiumAccess = function (sub) {
  if (!sub) return false;
  const now = new Date();
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const isRetryValid = sub.isInBillingRetry === true && (expiresAt > sixtyDaysAgo);

  return (
    (["ACTIVE", "CANCELLED"].includes(sub.status) && expiresAt > now) ||
    (sub.status === "GRACE" && sub.isInGracePeriod === true) ||
    isRetryValid
  );
};


SubscriptionSchema.statics.findActiveByUser = function (userId) {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  return this.findOne({
    userId,
    $or: [
      { status: { $in: ["ACTIVE", "CANCELLED"] }, expiresAt: { $gt: new Date() } },
      { status: "GRACE", isInGracePeriod: true },
      { isInBillingRetry: true, expiresAt: { $gt: sixtyDaysAgo } }
    ]
  }).sort({ expiresAt: -1 }); // Get the one that expires furthest in the future
};

module.exports = mongoose.model("Subscription", SubscriptionSchema);
