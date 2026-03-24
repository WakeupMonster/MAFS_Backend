// const mongoose = require("mongoose");

// const SubscriptionSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     platform: {
//       type: String,
//       enum: ["ios", "android"],
//       required: true,
//     },
//     productId: {
//       type: String,
//       required: true,
//     },
//     planType: {
//       type: String,
//       enum: ["weekly", "monthly", "yearly", "lifetime"],
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: [
//         "ACTIVE",
//         "GRACE",
//         "EXPIRED",
//         "CANCELLED",
//         "PAUSED",
//         "REVOKED",
//         "PENDING",
//       ],
//       required: true,
//     },
//     autoRenew: {
//       type: Boolean,
//       default: true,
//     },
//     startedAt: {
//       type: Date,
//       required: true,
//     },
//     expiresAt: {
//       type: Date,
//     },
//     gracePeriodEndsAt: Date,
//     pausedAt: Date,
//     resumesAt: Date,
//     originalTransactionId: {
//       type: String,
//       index: true,
//       sparse: true,
//     },
//     latestTransactionId: String,
//     appAccountToken: String,
//     purchaseToken: {
//       type: String,
//       index: true,
//       sparse: true,
//     },
//     orderId: String,
//     cancellationReason: {
//       type: String,
//       enum: [
//         "USER_CANCELLED",
//         "BILLING_ERROR",
//         "PRICE_CHANGE",
//         "PRODUCT_UNAVAILABLE",
//         "REFUNDED",
//         "UNKNOWN",
//       ],
//     },
//     cancelledAt: Date,
//     retryCount: {
//       type: Number,
//       default: 0,
//     },
//     previousStatus: String,
//     isInFamilySharing: {
//       type: Boolean,
//       default: false,
//     },
//     offerType: {
//       type: String,
//       enum: ["INTRODUCTORY", "PROMOTIONAL", "OFFER_CODE", "NONE"],
//       default: "NONE",
//     },
//     offerIdentifier: String,
//     priceConsentStatus: {
//       type: String,
//       enum: ["AGREED", "PENDING", "DECLINED"],
//     },
//     environment: {
//       type: String,
//       enum: ["sandbox", "production"],
//       required: true,
//     },
//     statusHistory: [
//       {
//         from: String,
//         to: String,
//         reason: String,
//         changedAt: { type: Date, default: Date.now },
//         _id: false,
//       },
//     ],
//   },
//   {
//     timestamps: true,
//     optimisticConcurrency: true,
//   }
// );

// SubscriptionSchema.index({ userId: 1, platform: 1, expiresAt: 1, status: 1 });

// SubscriptionSchema.pre("save", function (next) {
//   if (this.platform === "ios" && !this.originalTransactionId && !this.isNew) {
//     return next(new Error("originalTransactionId required for iOS"));
//   }
//   if (this.platform === "android" && !this.purchaseToken && !this.isNew) {
//     return next(new Error("purchaseToken required for Android"));
//   }
//   if (this.isModified("status") && !this.isNew) {
//     this.statusHistory.push({
//       from: this.previousStatus || "UNKNOWN",
//       to: this.status,
//       reason: this.cancellationReason || "system",
//       changedAt: new Date(),
//     });
//   }
//   next();
// });

// SubscriptionSchema.methods.isActive = function () {
//   return this.status === "ACTIVE" && this.expiresAt > new Date();
// };

// SubscriptionSchema.methods.isInGracePeriod = function () {
//   return this.status === "GRACE" && this.gracePeriodEndsAt > new Date();
// };

// SubscriptionSchema.methods.hasAccess = function () {
//   return this.isActive() || this.isInGracePeriod();
// };

// SubscriptionSchema.statics.findActiveByUser = function (userId) {
//   return this.findOne({
//     userId,
//     status: { $in: ["ACTIVE", "GRACE"] },
//     expiresAt: { $gt: new Date() },
//   });
// };

// module.exports = mongoose.model("Subscription", SubscriptionSchema);
// // ← ADD: Compound indexes for common queries
// SubscriptionSchema.index({ userId: 1, status: 1 });
// SubscriptionSchema.index({ userId: 1, platform: 1 });
// SubscriptionSchema.index({ expiresAt: 1, status: 1 }); // Cron ke liye


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
            default: false
        },

        grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
        grantReason: String, // e.g. "milestone_first_1000", "customer_service"

        // Tracks how the subscription was created
        source: {
            type: String,
            enum: ["STORE", "ADMIN", "GIVEAWAY", "MILESTONE"],
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
        prizeId: { type: mongoose.Schema.Types.ObjectId, ref: "GiveawayPrize", default: null }
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