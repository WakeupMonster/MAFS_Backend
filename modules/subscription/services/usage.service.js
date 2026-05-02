const User = require("../../auth/auth.model");
// const Profile = require("../../profile/profile.model");
const Subscription = require("../models/Subscription");
const SubscriptionConfig = require("../models_v3/SubscriptionConfig");
const UserDailyUsage = require("../models_v3/UserDailyUsage");
const UserWeeklyUsage = require("../models_v3/UserWeeklyUsage");
const UserMonthlyUsage = require("../models_v3/UserMonthlyUsage");
const UserConsumableBalance = require("../models_v3/UserConsumableBalance");
const Product = require("../models_v3/Product");
const dateHelpers = require("../utils/dateHelpers");
const featureService = require("./feature.service");

/**
 * Centalized service for usage tracking and enforcement.
 * Implements the "Two-Bucket" system (Free Quota vs. Wallet) with AEST timezone compliance.
 */


class UsageService {

    async useItem(userId, type) {
        const config = await SubscriptionConfig.getOrCreate();

        // Determine Subscription State (Source of Truth)
        const activeSub = await Subscription.findActiveByUser(userId).lean();

        const isPremium = !!activeSub;

        // Proactive Sync: Keep User/Profile flags updated
        this._syncPremiumState(userId, isPremium).catch(err => console.error('Sync Error:', err));

        switch (type) {
            case 'LIKE':
                return this._handleLikeUsage(userId, isPremium, config);
            case 'REWIND':
                return this._handleRewindUsage(userId, isPremium, config);
            case 'SUPER_KEEN':
                return this._handleSuperKeenUsage(userId, isPremium, config);
            case 'BOOST':
                return this._handleBoostUsage(userId, isPremium, config);
            default:
                throw new Error(`INVALID_USAGE_TYPE: ${type}`);
        }
    }

    /**
     * Returns a complete report for Flutter (The Status API Engine)
     */
    async getUsageStatus(userId) {
        const cache = require("../../../config/cache");
        const [config, activeSub, daily, weekly, monthly, wallet, boostTTL, user] = await Promise.all([
            SubscriptionConfig.getOrCreate(),
            Subscription.findActiveByUser(userId).lean(),
            UserDailyUsage.findOne({ userId, dateKey: dateHelpers.getDateKey() }).lean(),
            UserWeeklyUsage.findOne({ userId, weekKey: dateHelpers.getWeekKey() }).lean(),
            UserMonthlyUsage.findOne({ userId, monthKey: dateHelpers.getMonthKey() }).lean(),
            UserConsumableBalance.findOne({ userId }).lean(),
            cache.ttl(`boost:${userId}`), // Instantly gets the expiry timer from Redis
            User.findById(userId).select("giveaway").lean()
        ]);

        const isPremium = !!activeSub;
        this._syncPremiumState(userId, isPremium).catch(err => console.error('Sync Error:', err));

        // Fetch product details for displayName, subtitle, badge
        let productInfo = null;
        if (activeSub && activeSub.productId) {
            productInfo = await Product.findOne({
                $or: [
                    { appleProductId: activeSub.productId },
                    { googleProductId: activeSub.productId },
                    { productKey: activeSub.productId }
                ]
            }).select('displayName subtitle badge durationDays').lean();

            // --- SMART MAPPER FOR ADMIN GRANTS (No Store DB Entry) ---
            if (!productInfo) {
                // Exact calculation of days granted to avoid UI conflict with expiresAt
                const diffTime = Math.abs(new Date(activeSub.expiresAt) - new Date(activeSub.startedAt));
                const exactDuration = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (activeSub.source === 'GIVEAWAY') {
                    productInfo = {
                        displayName: activeSub.customDisplayName || "Giveaway Winner (trail price giveaway)",
                        durationDays: exactDuration,
                    };
                } else if (activeSub.source === 'MILESTONE') {
                    productInfo = {
                        displayName: activeSub.customDisplayName || "Early Adopter Premium",
                        durationDays: exactDuration,
                    };
                }
            }
        }

        // Quota values
        const likesLimit = isPremium ? config.premiumLimits.swipesPerDay : config.freeLimits.swipesPerDay;
        const likesUsed = daily?.likesUsed || 0;

        const rewindsLimit = isPremium ? config.premiumLimits.rewindsPerDay : config.freeLimits.rewindsPerDay;
        const rewindsUsed = daily?.rewindsUsed || 0;

        const skLimit = isPremium ? config.premiumLimits.superKeensPerDay : config.freeLimits.superKeensPerWeek;
        const skUsed = isPremium ? (daily?.superKeensUsed || 0) : (weekly?.superKeensUsed || 0);

        const boostsLimit = isPremium ? config.premiumLimits.boostsPerMonth : config.freeLimits.boostsPerMonth;
        const boostsUsed = monthly?.boostsUsed || 0;

        return {
            success: true,
            message: "Status fetched",
            data: {
                isPremium,
                planType: activeSub ? activeSub.planType : null,
                displayName: activeSub?.customDisplayName || productInfo?.displayName || (activeSub ? "Support Team Grant" : null),
                durationDays: productInfo?.durationDays || null,
                subtitle: productInfo?.subtitle || null,
                badge: productInfo?.badge || null,
                source: activeSub ? (activeSub.source || "STORE_PURCHASE") : null,
                status: activeSub ? activeSub.status : "NONE",
                expiresAt: activeSub ? activeSub.expiresAt : null,
                autoRenew: activeSub ? activeSub.autoRenew : false,
                isInBillingRetry: activeSub ? (activeSub.isInBillingRetry || false) : false,
                isInGracePeriod: activeSub ? (activeSub.isInGracePeriod || false) : false,
                gracePeriodEndsAt: activeSub ? activeSub.gracePeriodEndsAt : null,
                isCancelled: activeSub ? activeSub.status === 'CANCELLED' : false,
                cancelledAt: (activeSub && activeSub.status === 'CANCELLED') ? activeSub.cancelledAt : null,

                activeBoostSession: {
                    isBoostActive: boostTTL > 0,
                    remainingSeconds: boostTTL > 0 ? boostTTL : 0,
                    formattedTime: boostTTL > 0
                        ? `${String(Math.floor(boostTTL / 60)).padStart(2, '0')}:${String(boostTTL % 60).padStart(2, '0')}`
                        : "00:00"
                },

                allocations: {
                    likes: {
                        limit: likesLimit,
                        used: likesUsed,
                        remaining: likesLimit === -1 ? -1 : Math.max(0, likesLimit - likesUsed),
                        period: "daily",
                        resetsAt: dateHelpers.getDailyResetTime()
                    },
                    rewinds: {
                        limit: rewindsLimit,
                        used: rewindsUsed,
                        remaining: rewindsLimit === -1 ? -1 : Math.max(0, rewindsLimit - rewindsUsed),
                        period: "daily",
                        resetsAt: dateHelpers.getDailyResetTime()
                    },
                    superKeens: {
                        limit: skLimit,
                        used: skUsed,
                        remaining: skLimit === -1 ? -1 : Math.max(0, skLimit - skUsed),
                        period: isPremium ? "daily" : "weekly",
                        resetsAt: isPremium ? dateHelpers.getDailyResetTime() : dateHelpers.getWeeklyResetTime()
                    },
                    boosts: {
                        limit: boostsLimit,
                        used: boostsUsed,
                        remaining: boostsLimit === -1 ? -1 : Math.max(0, boostsLimit - boostsUsed),
                        period: "monthly",
                        resetsAt: dateHelpers.getMonthlyResetTime()
                    }
                },

                wallet: {
                    superKeens: wallet?.superKeensBalance || 0,
                    boosts: wallet?.boostsBalance || 0
                },

                premiumFeatures: {
                    seeWhoLikedYou: isPremium && config.premiumFeatures.seeWhoLikedYou,
                    passport: isPremium && config.premiumFeatures.passport,
                    advancedFilters: isPremium && config.premiumFeatures.advancedFilters,
                    noAds: isPremium && config.premiumFeatures.noAds
                },

                // ➕ NEW: Dynamic Features array (Single Source of Truth)
                PremiumFeatures: await featureService.getDynamicFeaturesForUser(userId, isPremium),

                showAds: !isPremium || !config.premiumFeatures.noAds,
                giveaway: user?.giveaway ? {
                    isEligibleForFreeTrial: user.giveaway.isEligibleForFreeTrial || false,
                    freeTrialDurationDays: user.giveaway.freeTrialDurationDays || 30,
                    description: user.giveaway.description || "First 1000 users milestone",
                    offerExpiresAt: user.giveaway.offerExpiresAt || null,
                    claimedAt: user.giveaway.claimedAt || null
                } : null
            }
        };
    }

    /**
     * Syncs isPremium flag across User and Profile models.
     */
    async _syncPremiumState(userId, isPremium) {
        let premiumExpiresAt = null;

        if (isPremium) {
            const SubscriptionModel = require("../models/Subscription");
            const activeSub = await SubscriptionModel.findActiveByUser(userId).lean();

            if (activeSub) {
                premiumExpiresAt = activeSub.expiresAt;
            }
        }

        await User.updateOne(
            { _id: userId },
            { $set: { isPremium, premiumExpiresAt } }
        );
    }


    //     async _syncPremiumState(userId, isPremium) {
    //     if (isPremium === false) {
    //         // Stop! Agar webhook ne bola 'false' karo, toh pehle check karo:
    //         // "Kya iske database mein koi aur (Giveaway/Store) ACTIVE plan toh nahi bacha?"
    //         const anyActiveSub = await Subscription.findActiveByUser(userId);
    //         if (anyActiveSub) {
    //              console.log("Bach gaye! Iske paas ek aur subscription hai.");
    //              isPremium = true; // Override kardo!
    //         }
    //     }

    //     await User.updateOne({ _id: userId }, { isPremium });
    // }


    // --- Helpers ---

    /**
     * Helper to atomically increment a quota bucket up to a maximum limit without conditional upsert errors (E11000).
     */
    async _incrementQuotaBucket(Model, query, field, limit) {
        // 1. Ensure the document exists without updating its value if it already does.
        try {
            await Model.findOneAndUpdate(
                query,
                { $setOnInsert: { [field]: 0 } },
                { upsert: true, setDefaultsOnInsert: true }
            );
        } catch (error) {
            // Ignore duplicate key error on initialization race condition
            if (error.code !== 11000) throw error;
        }

        // 2. Safely increment only if under limit
        const result = await Model.findOneAndUpdate(
            { ...query, [field]: { $lt: limit } },
            { $inc: { [field]: 1 } },
            { new: true }
        );

        return result; // Returns the updated document or null if limit reached
    }

    // --- Handlers ---

    async _handleLikeUsage(userId, isPremium, config) {
        const limit = isPremium ? config.premiumLimits.swipesPerDay : config.freeLimits.swipesPerDay;
        const dateKey = dateHelpers.getDateKey();

        if (limit === -1) return { success: true, remaining: -1 };

        const result = await this._incrementQuotaBucket(UserDailyUsage, { userId, dateKey }, 'likesUsed', limit);

        if (result) return { success: true, remaining: limit - result.likesUsed };
        throw new Error('LIMIT_REACHED');
    }

    async _handleRewindUsage(userId, isPremium, config) {
        if (isPremium) return { success: true, remaining: -1 };

        const limit = config.freeLimits.rewindsPerDay;
        const dateKey = dateHelpers.getDateKey();

        const result = await this._incrementQuotaBucket(UserDailyUsage, { userId, dateKey }, 'rewindsUsed', limit);

        if (result) return { success: true, remaining: limit - result.rewindsUsed };
        throw new Error('LIMIT_REACHED');
    }

    async _handleSuperKeenUsage(userId, isPremium, config) {
        const dateKey = dateHelpers.getDateKey();
        const weekKey = dateHelpers.getWeekKey();
        const quotaLimit = isPremium ? config.premiumLimits.superKeensPerDay : config.freeLimits.superKeensPerWeek;

        // Bucket 1: Quota
        const quotaQuery = isPremium ? { userId, dateKey } : { userId, weekKey };
        const UsageModel = isPremium ? UserDailyUsage : UserWeeklyUsage;

        const quotaResult = await this._incrementQuotaBucket(UsageModel, quotaQuery, 'superKeensUsed', quotaLimit);

        if (quotaResult) return { success: true, source: 'QUOTA', remaining: quotaLimit - quotaResult.superKeensUsed };

        // Bucket 2: Wallet
        const walletResult = await UserConsumableBalance.findOneAndUpdate(
            { userId, superKeensBalance: { $gt: 0 } },
            { $inc: { superKeensBalance: -1 } },
            { new: true }
        );

        if (walletResult) return { success: true, source: 'WALLET', remaining: walletResult.superKeensBalance };
        throw new Error('LIMIT_REACHED');
    }

    async _handleBoostUsage(userId, isPremium, config) {
        const monthKey = dateHelpers.getMonthKey();
        const quotaLimit = isPremium ? config.premiumLimits.boostsPerMonth : config.freeLimits.boostsPerMonth;

        // Bucket 1: Quota
        if (quotaLimit > 0) {
            const quotaResult = await this._incrementQuotaBucket(UserMonthlyUsage, { userId, monthKey }, 'boostsUsed', quotaLimit);
            if (quotaResult) return { success: true, source: 'QUOTA', remaining: quotaLimit - quotaResult.boostsUsed };
        }

        // Bucket 2: Wallet
        const walletResult = await UserConsumableBalance.findOneAndUpdate(
            { userId, boostsBalance: { $gt: 0 } },
            { $inc: { boostsBalance: -1 } },
            { new: true }
        );

        if (walletResult) return { success: true, source: 'WALLET', remaining: walletResult.boostsBalance };
        throw new Error('LIMIT_REACHED');
    }
}

module.exports = new UsageService();