const mongoose = require("mongoose");

const SubscriptionTransactionSchema = new mongoose.Schema(
    {
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription",
            // Optional now because consumables don't have a Subscription doc
            required: false,
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
            enum: ["ios", "android", "admin_granted"],
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
            type: String, // Store Product ID (Apple/Google)
            required: true,
        },
        productKey: {
            type: String, // Internal lookup key (e.g. "superkeen_5")
            required: false,
        },
        eventType: {
            type: String,
            enum: [
                "PURCHASE",
                "RENEW",
                "CANCEL",
                "REFUND",
                "EXPIRE",
                "PAUSE",
                "RESUME",
                "PRICE_CHANGE",
                "BILLING_RETRY",
                "REVOKE",
                "CONSUMABLE_PURCHASE", // NEW: For packs
                "MILESTONE_GRANT",     // NEW: For auto-grant
                "ADMIN_GRANT"          // NEW: For manual admin grant
            ],
            required: true,
        },
        amount: Number,
        currency: { type: String, default: 'AUD' },
        refundReason: String,
        refundAmount: Number,
        rawResponse: {
            type: mongoose.Schema.Types.Mixed,
        },
        occurredAt: {
            type: Date,
            required: true,
            default: Date.now
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
SubscriptionTransactionSchema.index({ userId: 1, occurredAt: -1 });

module.exports = mongoose.model("SubscriptionTransaction", SubscriptionTransactionSchema);
