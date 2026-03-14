/* eslint-disable no-unused-vars */
const mongoose = require("mongoose");
const SubscriptionConfig = require("../models_v3/SubscriptionConfig");
const Product = require("../models_v3/Product");
const Subscription = require("../models/Subscription"); // Base subscription records
const SubscriptionTransaction = require("../models/SubscriptionTransaction");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const UserConsumableBalance = require("../models_v3/UserConsumableBalance");
const subscriptionService = require("../services/subscription.service");
const UsageService = require("../services/usage.service");
const logger = require("../utils/logger");

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

        // Enhanced Search: Nickname, Phone, Email
        if (search) {
            const searchRegex = new RegExp(search, 'i');

            // 1. Dhoondho matching Users (Phone, Email)
            const matchedUsers = await User.find({
                $or: [
                    { email: searchRegex },
                    { phone: searchRegex }
                ]
            }).select('_id').lean();

            // 2. Dhoondho matching Profiles (Nickname)
            const matchedProfiles = await Profile.find({
                $or: [
                    { nickname: searchRegex },
                    { fullName: searchRegex }
                ]
            }).select('userId').lean();

            const userIds = [
                ...matchedUsers.map(u => u._id),
                ...matchedProfiles.map(p => p.userId)
            ];

            // 3. Subscription filter mein User IDs add karo
            filter.$or = [
                { userId: { $in: userIds } },
                { productId: searchRegex }
            ];

            // Agar search valid ObjectId hai toh direct match bhi karo
            if (mongoose.isValidObjectId(search)) {
                filter.$or.push({ userId: search });
            }
        }

        const subscriptions = await Subscription.find(filter)
            .populate("userId", "email phone")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        // 4. Sabhi subscriptions ke liye Profiles fetch karo (Photo aur Nickname ke liye)
        const subUserIds = subscriptions.map(s => s.userId?._id).filter(id => id);
        const profiles = await Profile.find({ userId: { $in: subUserIds } })
            .select("userId nickname photos fullName")
            .lean();

        // Create a lookup map for profiles
        const profileMap = profiles.reduce((acc, p) => {
            acc[p.userId.toString()] = p;
            return acc;
        }, {});

        // 5. Response ko enrich karo aur structure saaf karo
        const enrichedSubs = subscriptions.map(sub => {
            const userProfile = sub.userId ? profileMap[sub.userId._id.toString()] : null;
            const isActuallyExpired = sub.expiresAt && new Date(sub.expiresAt) < new Date();

            const responseObj = {
                 user: {
                    _id: sub.userId?._id,
                    phone: sub.userId?.phone || 'N/A',
                    email: sub.userId?.email || 'N/A',
                    nickname: userProfile?.nickname || userProfile?.fullName || 'N/A',
                    photo: userProfile?.photos?.[0]?.url || null
                },
                ...sub,
                isExpired: isActuallyExpired,
            };

            // Remove the redundant userId object to keep it clean
            delete responseObj.userId;
            
            return responseObj;
        });

        const total = await Subscription.countDocuments(filter);

        return res.json({
            success: true,
            data: enrichedSubs,
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

        const [user, profile, subscription, transactions, wallet] = await Promise.all([
            User.findById(userId).select("phone email role accountStatus").lean(),
            Profile.findOne({ userId }).select("fullName nickname photos").lean(),
            Subscription.findOne({ userId }).sort({ createdAt: -1 }).lean(),
            SubscriptionTransaction.find({ userId }).sort({ occurredAt: -1 }).limit(10).lean(),
            UserConsumableBalance.findOne({ userId }).lean()
        ]);

        return res.json({
            success: true,
            data: {
                user: {
                    ...user,
                    fullName: profile?.fullName,
                    nickname: profile?.nickname,
                    photo: profile?.photos?.[0]?.url || null
                },
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
exports.
getStats = async (req, res, next) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            activeCountCurrent,
            activeCountLastMonth,
            consumableRevenue,
            newPremiumCounts,
            newUsersCount,
            cancellationsCount,
            milestoneUsers,
            config,
            revenueTrends,
            growthTrends,
            platformSplit,
            planDistribution,
            activeSubscriptions
        ] = await Promise.all([
            // 1. Active Subscribers Current
            Subscription.countDocuments({ status: "ACTIVE" }),
            // 2. Active Subscribers at start of this month (approx)
            Subscription.countDocuments({ status: "ACTIVE", createdAt: { $lt: startOfMonth } }),
            // 3. Consumable Revenue (this month)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        eventType: "CONSUMABLE_PURCHASE",
                        occurredAt: { $gte: startOfMonth }
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // 4. New Premium Subscribers (this month)
            Subscription.countDocuments({ status: "ACTIVE", createdAt: { $gte: startOfMonth } }),
            // 5. Total New Users (this month)
            User.countDocuments({ createdAt: { $gte: startOfMonth }, isFake: false }),
            // 6. Cancellations (this month)
            SubscriptionTransaction.countDocuments({ eventType: "CANCEL", occurredAt: { $gte: startOfMonth } }),
            // 7. Milestone Users
            Subscription.countDocuments({ planType: "MILESTONE" }),
            // 8. Config
            SubscriptionConfig.getOrCreate(),
            // 9. Revenue Trends (last 30 days)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: last30Days },
                        eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] }
                    }
                },
                {
                    $group: {
                        _id: {
                            day: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
                            type: { $cond: [{ $eq: ["$eventType", "CONSUMABLE_PURCHASE"] }, "consumable", "subscription"] }
                        },
                        amount: { $sum: "$amount" }
                    }
                },
                { $sort: { "_id.day": 1 } }
            ]),
            // 10. Growth Trends (last 30 days)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: last30Days },
                        eventType: { $in: ["PURCHASE", "CANCEL"] }
                    }
                },
                {
                    $group: {
                        _id: {
                            day: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
                            type: "$eventType"
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.day": 1 } }
            ]),
            // 11. Platform Split (Revenue)
            SubscriptionTransaction.aggregate([
                {
                    $match: { eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] } }
                },
                {
                    $group: {
                        _id: "$platform",
                        revenue: { $sum: "$amount" }
                    }
                }
            ]),
            // 12. Plan Distribution
            Subscription.aggregate([
                { $match: { status: "ACTIVE" } },
                {
                    $group: {
                        _id: "$planType",
                        count: { $sum: 1 }
                    }
                }
            ]),
            // 13. Active subs for MRR calculation
            Subscription.find({ status: "ACTIVE" }).select("productId planType").lean()
        ]);

        // Calculate MRR
        // We fetching prices for mapping
        const subscriptionProducts = await Product.find({ type: 'SUBSCRIPTION' }).lean();
        const priceMap = {};
        subscriptionProducts.forEach(p => {
            const monthlyPrice = p.durationDays ? (parseFloat(String(p.displayPrice).replace(/[^0-9.]/g, '')) / (p.durationDays / 30)) : 0;
            priceMap[p.productKey] = monthlyPrice;
            // Fallback for store IDs
            if (p.appleProductId) priceMap[p.appleProductId] = monthlyPrice;
            if (p.googleProductId) priceMap[p.googleProductId] = monthlyPrice;
        });

        let totalMRR = 0;
        activeSubscriptions.forEach(sub => {
            totalMRR += priceMap[sub.productId] || 0;
        });

        // Format Trends
        const formattedRevTrend = {};
        revenueTrends.forEach(item => {
            if (!formattedRevTrend[item._id.day]) formattedRevTrend[item._id.day] = { day: item._id.day, subscription: 0, consumable: 0 };
            formattedRevTrend[item._id.day][item._id.type] = item.amount;
        });

        const formattedGrowthTrend = {};
        growthTrends.forEach(item => {
            if (!formattedGrowthTrend[item._id.day]) formattedGrowthTrend[item._id.day] = { day: item._id.day, new: 0, cancelled: 0 };
            if (item._id.type === 'PURCHASE') formattedGrowthTrend[item._id.day].new = item.count;
            if (item._id.type === 'CANCEL') formattedGrowthTrend[item._id.day].cancelled = item.count;
        });

        // KPI calculations
        const subChange = activeCountLastMonth > 0 ? (((activeCountCurrent - activeCountLastMonth) / activeCountLastMonth) * 100).toFixed(1) : 0;

        return res.json({
            success: true,
            data: {
                kpis: {
                    activeSubscribers: {
                        count: activeCountCurrent,
                        change: `${subChange}%`
                    },
                    mrr: {
                        amount: Math.round(totalMRR),
                        currency: "AUD"
                    },
                    consumableRevenue: {
                        amount: consumableRevenue[0]?.total || 0,
                        currency: "AUD"
                    },
                    conversionRate: newUsersCount > 0 ? ((newPremiumCounts / newUsersCount) * 100).toFixed(1) + "%" : "0%",
                    churnRate: activeCountLastMonth > 0 ? ((cancellationsCount / activeCountLastMonth) * 100).toFixed(1) + "%" : "0%",
                    milestone: {
                        currentCount: milestoneUsers,
                        target: config.milestone.targetUserCount,
                        progress: (milestoneUsers / config.milestone.targetUserCount * 100).toFixed(1)
                    }
                },
                charts: {
                    revenueTrend: Object.values(formattedRevTrend),
                    subscriberGrowth: Object.values(formattedGrowthTrend).map(d => ({ ...d, net: d.new - d.cancelled })),
                    platformSplit: platformSplit.map(p => ({ platform: p._id, revenue: p.revenue })),
                    planDistribution: planDistribution.map(p => ({ plan: p._id, count: p.count }))
                }
            }
        });

    } catch (err) {
        next(err);
    }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const { timeFilter = 'last7' } = req.query; // daily, weekly, last7, last15, last30, allTime
        
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const next24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        let startDate;
        if (timeFilter === 'daily') {
            startDate = startOfToday;
        } else if (timeFilter === 'weekly' || timeFilter === 'last7') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeFilter === 'last15') {
            startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        } else if (timeFilter === 'last30') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeFilter === 'allTime') {
            startDate = new Date(0); // Beginning of time
        } else {
            // Default to 7 days
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // 1. Parallel aggregates for high performance
        const results = await Promise.all([
            // [0] Overall Active Counts (Independent of time filter, shows current state)
            Subscription.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSubscribers: { $sum: 1 },
                        activeSubscribers: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } }
                    }
                }
            ]),
            // [1] Revenue Trend (Filtered by startDate)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: startDate },
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
            // [2] Best Selling Products (Filtered by startDate for context-aware best sellers)
            SubscriptionTransaction.aggregate([
                { 
                    $match: { 
                        occurredAt: { $gte: startDate },
                        eventType: { $in: ["PURCHASE", "CONSUMABLE_PURCHASE"] } 
                    } 
                },
                {
                    $group: {
                        _id: "$productId",
                        salesCount: { $sum: 1 }
                    }
                },
                { $sort: { salesCount: -1 } },
                { $limit: 10 }
            ]),
            // [3] Platform Distribution (of active subs, independent of filter)
            Subscription.aggregate([
                { $match: { status: "ACTIVE" } },
                {
                    $group: {
                        _id: "$platform",
                        count: { $sum: 1 }
                    }
                }
            ]),
            // [4] Total Non-Fake Users
            User.countDocuments({ isFake: false }),
            // [5] SubscriptionConfig
            SubscriptionConfig.getOrCreate(),
            // [6] Today's specific KPIs (always today, unaffected by filter)
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
            // [7] Last 24h vs Next 24h Activity (always relative to now)
            Promise.all([
                Subscription.countDocuments({ createdAt: { $gte: last24hStart } }), // New plans last 24h
                SubscriptionTransaction.countDocuments({ eventType: "CONSUMABLE_PURCHASE", occurredAt: { $gte: last24hStart } }), // Wallet packs last 24h
                SubscriptionTransaction.countDocuments({ eventType: "CANCEL", occurredAt: { $gte: last24hStart } }), // Cancellations last 24h
                Subscription.countDocuments({ status: "ACTIVE", expiresAt: { $gte: now, $lte: next24hEnd } }), // Plans expiring in 24h
            ])
        ]);

        const [
            totals,
            revenueTrend,
            bestSellingProducts,
            platformMix,
            milestoneUsers,
            config,
            todayStats,
            last24hActivity
        ] = results;

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
