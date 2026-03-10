/* eslint-disable no-unused-vars */
const SubscriptionConfig = require("../models_v3/SubscriptionConfig");
const Product = require("../models_v3/Product");
const Subscription = require("../models/Subscription"); // Base subscription records
const SubscriptionTransaction = require("../models/SubscriptionTransaction");
const User = require("../../auth/auth.model");
const UserConsumableBalance = require("../models_v3/UserConsumableBalance");
const subscriptionService = require("../services/subscription.service");
const UsageService = require("../services/usage.service");
const logger = require("../utils/logger");
const { default: mongoose } = require("mongoose");

/**
 * 1. CONFIGURATION APIs
 */

exports.getConfig = async (req, res, next) => {
    try {
        const config = await SubscriptionConfig.getOrCreate();
        return res.json({ success: true, data: config });
    } catch (err) {
        next(err);
    }
};

exports.updateConfig = async (req, res, next) => {
    try {
        const config = await SubscriptionConfig.getOrCreate();

        // Partially update fields provided in body
        if (req.body.freeLimits) config.freeLimits = { ...config.freeLimits, ...req.body.freeLimits };
        if (req.body.premiumLimits) config.premiumLimits = { ...config.premiumLimits, ...req.body.premiumLimits };
        if (req.body.premiumFeatures) config.premiumFeatures = { ...config.premiumFeatures, ...req.body.premiumFeatures };
        if (req.body.milestone) config.milestone = { ...config.milestone, ...req.body.milestone };

        config.updatedAt = new Date();
        await config.save();

        return res.json({ success: true, message: "Configuration updated", data: config });
    } catch (err) {
        next(err);
    }
};

/**
 * 2. PRODUCT CATALOG APIs
 */
exports.listProducts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type, isActive } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const products = await Product.find(filter)
            .sort({ sortOrder: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        const total = await Product.countDocuments(filter);

        return res.json({
            success: true,
            data: products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.createProduct = async (req, res, next) => {
    try {
        const product = await Product.create(req.body);
        return res.status(201).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

exports.updateProduct = async (req, res, next) => {
    try {
        const { productKey } = req.params;
        const product = await Product.findOneAndUpdate(
            { productKey },
            { $set: req.body },
            { new: true }
        );
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        return res.json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

/**
 * 3. USER MANAGEMENT (Subscribers)
 */
exports.listSubscribers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, planType, platform, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (planType) filter.planType = planType;
        if (platform) filter.platform = platform;

        // Search by User ID or Product ID
        if (search) {
            filter.$or = [
                { userId: mongoose.isValidObjectId(search) ? search : null },
                { productId: { $regex: search, $options: 'i' } }
            ].filter(f => Object.values(f)[0] !== null);
        }

        const subscriptions = await Subscription.find(filter)
            .populate("userId", "firstName lastName email phone nickname")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        const total = await Subscription.countDocuments(filter);

        return res.json({
            success: true,
            data: subscriptions,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.getUserSubscriptionDetail = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const [subscription, transactions, wallet] = await Promise.all([
            Subscription.findOne({ userId }).sort({ createdAt: -1 }).lean(),
            SubscriptionTransaction.find({ userId }).sort({ occurredAt: -1 }).limit(10).lean(),
            UserConsumableBalance.findOne({ userId }).lean()
        ]);

        return res.json({
            success: true,
            data: {
                subscription,
                recentTransactions: transactions,
                wallet
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * 4. MANUAL GRANTS & REVOCATION
 */
exports.manualGrant = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { planType, durationDays = 30, reason } = req.body;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const subscription = await Subscription.create({
            userId,
            platform: "admin_granted",
            productId: `manual_${planType.toLowerCase()}`,
            planType: planType || "MONTHLY",
            status: "ACTIVE",
            autoRenew: false,
            startedAt: new Date(),
            expiresAt,
            grantReason: reason || "Admin manual grant",
            environment: "production"
        });

        // Sync flags
        await UsageService._syncPremiumState(userId, true);
        await subscriptionService._syncProfile(subscription);

        return res.json({ success: true, message: "Subscription granted successfully", data: subscription });
    } catch (err) {
        next(err);
    }
};

exports.grantConsumables = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { type, quantity, reason } = req.body; // type: SUPER_KEEN or BOOST

        const incrementField = {};
        if (type === 'SUPER_KEEN') incrementField.superKeensBalance = quantity;
        else if (type === 'BOOST') incrementField.boostsBalance = quantity;
        else return res.status(400).json({ success: false, message: "Invalid consumable type" });

        const wallet = await UserConsumableBalance.findOneAndUpdate(
            { userId },
            { $inc: incrementField },
            { upsert: true, new: true }
        );

        // TODO: Log this in transaction history if needed

        return res.json({ success: true, message: "Consumables granted", wallet });
    } catch (err) {
        next(err);
    }
};

exports.revokeSubscription = async (req, res, next) => {
    try {
        const { userId } = req.params;

        await Subscription.updateMany(
            { userId, status: "ACTIVE" },
            { $set: { status: "REVOKED", updatedAt: new Date() } }
        );

        await UsageService._syncPremiumState(userId, false);
        // Profile sync with empty sub info
        await subscriptionService._syncProfile({ userId, status: "REVOKED", planType: "NONE" });

        return res.json({ success: true, message: "Subscription revoked successfully" });
    } catch (err) {
        next(err);
    }
};

/**
 * 5. DASHBOARD / STATS
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const next24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Parallel aggregates for high performance
        const [
            totals,
            revenueTrend,
            bestSellingProducts,
            platformMix,
            milestoneUsers,
            config,
            todayStats,
            last24hActivity
        ] = await Promise.all([
            // Overall Active Counts
            Subscription.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSubscribers: { $sum: 1 },
                        activeSubscribers: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } }
                    }
                }
            ]),
            // Revenue Trend (Last 7 Days)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: sevenDaysAgo },
                        eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
                        dailyRevenue: { $sum: { $ifNull: ["$amount", 0] } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            // Best Selling Products (Volume based)
            SubscriptionTransaction.aggregate([
                { $match: { eventType: { $in: ["PURCHASE", "CONSUMABLE_PURCHASE"] } } },
                {
                    $group: {
                        _id: "$productId",
                        salesCount: { $sum: 1 }
                    }
                },
                { $sort: { salesCount: -1 } },
                { $limit: 10 }
            ]),
            // Platform Distribution (of active subs)
            Subscription.aggregate([
                { $match: { status: "ACTIVE" } },
                {
                    $group: {
                        _id: "$platform",
                        count: { $sum: 1 }
                    }
                }
            ]),
            User.countDocuments({ isFake: false }),
            SubscriptionConfig.getOrCreate(),
            // Today's specific KPIs (since 00:00:00)
            Promise.all([
                Subscription.countDocuments({ createdAt: { $gte: startOfToday } }), // todayNew
                SubscriptionTransaction.countDocuments({ eventType: "CANCEL", occurredAt: { $gte: startOfToday } }), // todayCancelled
                SubscriptionTransaction.aggregate([
                    {
                        $match: {
                            occurredAt: { $gte: startOfToday },
                            eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] }
                        }
                    },
                    { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
                ]) // todayRevenue
            ]),
            // Last 24h vs Next 24h Activity
            Promise.all([
                Subscription.countDocuments({ createdAt: { $gte: last24hStart } }), // New plans last 24h
                SubscriptionTransaction.countDocuments({ eventType: "CONSUMABLE_PURCHASE", occurredAt: { $gte: last24hStart } }), // Wallet packs last 24h
                SubscriptionTransaction.countDocuments({ eventType: "CANCEL", occurredAt: { $gte: last24hStart } }), // Cancellations last 24h
                Subscription.countDocuments({ status: "ACTIVE", expiresAt: { $gte: now, $lte: next24hEnd } }), // Plans expiring in 24h
            ])
        ]);

        const totalUserCount = await User.countDocuments();

        return res.json({
            success: true,
            data: {
                kpis: {
                    totalUsers: totalUserCount,
                    totalSubscribers: totals[0]?.totalSubscribers || 0,
                    activeSubscribers: totals[0]?.activeSubscribers || 0,
                    conversionRate: totalUserCount > 0 ? ((totals[0]?.activeSubscribers || 0) / totalUserCount * 100).toFixed(2) + "%" : "0%",
                    todayNew: todayStats[0],
                    todayCancelled: todayStats[1],
                    todayRevenue: todayStats[2][0]?.total || 0,
                },
                last24HoursActivity: {
                    newSubscriptions: last24hActivity[0],
                    walletPacksBought: last24hActivity[1],
                    cancellations: last24hActivity[2],
                    plansExpiringSoon: last24hActivity[3] // Expiry in next 24h
                },
                revenueTrend: revenueTrend,
                bestSellingProducts: bestSellingProducts,
                platformMix: platformMix,
                milestone: {
                    currentCount: milestoneUsers,
                    targetCount: config.milestone.targetUserCount,
                    isActive: config.milestone.isActive,
                    percentage: (milestoneUsers / config.milestone.targetUserCount) * 100
                }
            }
        });
    } catch (err) {
        next(err);
    }
};
