const mongoose = require('mongoose');

const subscriptionConfigSchema = new mongoose.Schema({
    // Quota Limits for Free Users
    freeLimits: {
        swipesPerDay: { type: Number, default: 30 },
        rewindsPerDay: { type: Number, default: 3 },
        superKeensPerWeek: { type: Number, default: 1 },
        boostsPerMonth: { type: Number, default: 0 }
    },
    // Quota Limits for Premium Users
    premiumLimits: {
        swipesPerDay: { type: Number, default: -1 }, // -1 = Unlimited
        rewindsPerDay: { type: Number, default: -1 },
        superKeensPerDay: { type: Number, default: 3 },
        boostsPerMonth: { type: Number, default: 2 }
    },
    // Feature Toggles (Admin can enable/disable features globally for Premium)
    premiumFeatures: {
        seeWhoLikedYou: { type: Boolean, default: true },
        passport: { type: Boolean, default: true },
        advancedFilters: { type: Boolean, default: true },
        noAds: { type: Boolean, default: true }
    },
    // ➕ NEW: Dynamic Features (Fully manageable from Admin Panel)
    dynamicFeatures: [
        {
            key: { type: String, required: true },
            name: { type: String, required: true },
            description: { type: String },
            icon: { type: String },
            isActive: { type: Boolean, default: true },
            isPremiumOnly: { type: Boolean, default: true },
            _id: false // No need for separate IDs here
        }
    ],
    // Milestone Program (First 1,000 users)
    milestone: {
        targetUserCount: { type: Number, default: 1000 },
        grantDurationDays: { type: Number, default: 30 },
        isActive: { type: Boolean, default: true }
    },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'subscription_configs'
});

// Ensure only one config document exists (Singleton pattern)
subscriptionConfigSchema.statics.getOrCreate = async function () {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({});
    }

    return config;
};

module.exports = mongoose.model('SubscriptionConfig', subscriptionConfigSchema);
