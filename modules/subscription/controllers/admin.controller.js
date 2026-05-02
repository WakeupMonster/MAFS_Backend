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
        if (req.body.dynamicFeatures) config.dynamicFeatures = req.body.dynamicFeatures;

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
            // Return ALL transactions (not just 10)
            SubscriptionTransaction.find({ userId }).sort({ occurredAt: -1 }).lean(),
            UserConsumableBalance.findOne({ userId }).lean()
        ]);

        // Fetch subscription history (all past subscriptions except the current one)
        const subscriptionHistory = await Subscription.find({
            userId: userId,
            ...(subscription?._id ? { _id: { $ne: subscription._id } } : {})
        }).sort({ createdAt: -1 }).lean();

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
                subscriptionHistory,
                transactions,
                recentTransactions: transactions, // Keep backward compatibility
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
            source: "ADMIN",
            environment: "production"
        });

        // Log the admin grant as a transaction
        await SubscriptionTransaction.create({
            userId,
            subscriptionId: subscription._id,
            platform: "ADMIN",
            eventType: "ADMIN_GRANT",
            productId: `manual_${planType.toLowerCase()}`,
            amount: 0,
            currency: "AUD",
            reason: reason || "Admin manual grant",
            occurredAt: new Date(),
            idempotencyKey: `admin_GRANT_${subscription._id}_${Date.now()}`
        });

        // Sync flags
        await UsageService._syncPremiumState(userId, true);
        await subscriptionService._syncProfile(subscription);

        return res.json({ success: true, message: "Subscription granted successfully", data: { subscription } });
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

        // Log the consumable grant as a transaction for audit trail
        await SubscriptionTransaction.create({
            userId,
            platform: "ADMIN",
            eventType: "ADMIN_CONSUMABLE_GRANT",
            productId: type, // "SUPER_KEEN" or "BOOST"
            amount: 0,
            currency: "AUD",
            reason: reason || "Admin consumable grant",
            occurredAt: new Date(),
            idempotencyKey: `admin_CONSUMABLE_${userId}_${type}_${Date.now()}`
        });

        return res.json({ success: true, message: "Consumables granted", wallet });
    } catch (err) {
        next(err);
    }
};

exports.revokeSubscription = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body || {};

        // Check if user has an active subscription
        const activeSubscription = await Subscription.findOne({ userId, status: "ACTIVE" });

        if (!activeSubscription) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found"
            });
        }

        // Restrict revoking store-purchased subscriptions (fallback check for old records)
        const isStorePurchase = activeSubscription.source === "STORE" && activeSubscription.platform !== "admin_granted";

        if (isStorePurchase) {
            return res.status(400).json({
                success: false,
                message: "Cannot revoke store-purchased subscriptions. User must request refund through Apple/Google."
            });
        }

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
 * EXTEND SUBSCRIPTION — Adds extra days to expiresAt
 */
exports.extendSubscription = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { days, reason } = req.body;

        // Validation
        if (!days || !Number.isInteger(days) || days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                message: "days must be a positive integer between 1 and 365"
            });
        }

        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "reason is required"
            });
        }

        const subscription = await Subscription.findOne({
            userId,
            status: "ACTIVE"
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found"
            });
        }

        const previousExpiresAt = new Date(subscription.expiresAt);
        const newExpiresAt = new Date(previousExpiresAt.getTime() + (days * 24 * 60 * 60 * 1000));

        subscription.expiresAt = newExpiresAt;
        await subscription.save();

        // Log the extension as a transaction
        await SubscriptionTransaction.create({
            userId,
            subscriptionId: subscription._id,
            platform: "ADMIN",
            eventType: "EXTENSION",
            productId: subscription.productId,
            amount: 0,
            currency: "AUD",
            reason: reason,
            occurredAt: new Date(),
            idempotencyKey: `admin_EXTENSION_${subscription._id}_${Date.now()}`
        });

        // Sync profile with updated expiry
        await subscriptionService._syncProfile(subscription);

        return res.json({
            success: true,
            message: `Subscription extended by ${days} days`,
            data: {
                previousExpiresAt: previousExpiresAt.toISOString(),
                newExpiresAt: newExpiresAt.toISOString(),
                daysAdded: days
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * 5. DASHBOARD / STATS
 */

exports.getDashboardStats = async (req, res, next) => {
    try {
        const { timeFilter = 'last7', startDate: queryStartDate, endDate: queryEndDate } = req.query;

        // timeFilter - recent.

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const next24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        let startDate;
        let endDate = now; // Default end date

        if (queryStartDate) {
            // Frontend passes custom dates
            startDate = new Date(queryStartDate);
            if (queryEndDate) endDate = new Date(queryEndDate);
        } else {
            // Fallbacks: handles "daily", "last7", "90", "1", etc.
            if (timeFilter === 'daily' || timeFilter === '1') {
                startDate = startOfToday;
            } else if (timeFilter === 'weekly' || timeFilter === 'last7' || timeFilter === '7') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (timeFilter === 'last15' || timeFilter === '15') {
                startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
            } else if (timeFilter === 'last30' || timeFilter === '30') {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            } else if (timeFilter === 'allTime') {
                startDate = new Date(0);
            } else if (!isNaN(timeFilter)) {
                startDate = new Date(now.getTime() - Number(timeFilter) * 24 * 60 * 60 * 1000);
            } else {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
        }

        // 1. Parallel aggregates for high performance
        const results = await Promise.all([
            // [0] Overall Active Counts (Optimized to avoid full collection scan)
            Promise.all([
                Subscription.countDocuments(),
                Subscription.countDocuments({ status: "ACTIVE" })
            ]).then(([totalSubscribers, activeSubscribers]) => [{ totalSubscribers, activeSubscribers }]),
            // [1] Revenue Trend (Filtered by date range)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: startDate, $lte: endDate },
                        eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] }
                    }
                },
                {
                    $group: {
                        _id: {
                            day: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
                            productId: "$productId"
                        },
                        amount: { $sum: { $ifNull: ["$amount", 0] } }
                    }
                },
                { $sort: { "_id.day": 1 } }
            ]),
            // [2] Revenue by Product (Best Selling)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: startDate, $lte: endDate },
                        eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] }
                    }
                },
                {
                    $group: {
                        _id: "$productId",
                        salesCount: { $sum: 1 },
                        revenue: { $sum: { $ifNull: ["$amount", 0] } }
                    }
                },
                { $sort: { revenue: -1 } }
            ]),
            // [3] Platform Distribution (Revenue Split)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: startDate, $lte: endDate },
                        eventType: { $in: ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"] }
                    }
                },
                {
                    $group: {
                        _id: "$platform",
                        revenue: { $sum: "$amount" }
                    }
                }
            ]),
            // [4] Total Non-Fake Users
            User.countDocuments({ isFake: false }),
            // [5] SubscriptionConfig
            SubscriptionConfig.getOrCreate(),
            // [6] Monthly Metrics for KPIs (Count active at start of month)
            Subscription.countDocuments({
                status: "ACTIVE",
                createdAt: { $lt: startOfMonth },
                expiresAt: { $gt: startOfMonth }
            }),
            // [7] Cancellations (current month)
            SubscriptionTransaction.countDocuments({
                eventType: "CANCEL",
                occurredAt: { $gte: startOfMonth }
            }),
            // [8] Today's specific KPIs
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
            // [9] Last 24h Activity
            Promise.all([
                Subscription.countDocuments({ createdAt: { $gte: last24hStart } }),
                SubscriptionTransaction.countDocuments({ eventType: "CONSUMABLE_PURCHASE", occurredAt: { $gte: last24hStart } }),
                SubscriptionTransaction.countDocuments({ eventType: "CANCEL", occurredAt: { $gte: last24hStart } }),
                Subscription.countDocuments({
                    status: "ACTIVE",
                    expiresAt: { $gte: now, $lte: next24hEnd }
                }),
            ]),
            // [10] Plan Distribution (Snapshot)
            Subscription.aggregate([
                { $match: { status: "ACTIVE", expiresAt: { $gt: now } } },
                {
                    $group: {
                        _id: "$planType",
                        count: { $sum: 1 }
                    }
                }
            ]),
            // [11] Active subs for MRR (Optimized to aggregate DB-side instead of RAM)
            Subscription.aggregate([
                { $match: { status: "ACTIVE", expiresAt: { $gt: now } } },
                { $group: { _id: "$productId", count: { $sum: 1 } } }
            ]),
            // [12] Total Consumable Revenue — Super Keen + Supercharge sales this month
            SubscriptionTransaction.aggregate([
                { $match: { eventType: "CONSUMABLE_PURCHASE", occurredAt: { $gte: startOfMonth } } },
                { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
            ]),
            // [13] Subscriber Growth Trend (new vs cancelled)
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        occurredAt: { $gte: startDate, $lte: endDate },
                        eventType: { $in: ["PURCHASE", "ADMIN_GRANT", "GIVEAWAY", "CANCEL", "EXPIRE", "REVOKE"] }
                    }
                },
                {
                    $group: {
                        _id: {
                            day: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
                            type: { $cond: [{ $in: ["$eventType", ["PURCHASE", "ADMIN_GRANT", "GIVEAWAY"]] }, "new", "cancelled"] }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.day": 1 } }
            ]),

            Subscription.countDocuments({ planType: 'MILESTONE' })
        ]);

        const [
            totals,
            rawRevenueTrend,
            bestSellingProducts,
            platformMix,
            totalActiveUsers,
            config,
            activeCountStartOfMonth,
            monthlyCancellations,
            todayStats,
            last24hActivity,
            planDistribution,
            activeSubscriptions,
            monthlyConsumableRevenueResult,
            rawSubscriberGrowth,
            milestoneCount
        ] = results;

        // MRR Calculation
        // MRR Calculation & Product mapping
        const allProducts = await Product.find().lean();
        const priceMap = {};
        const productNameMap = {};
        const categoryMap = {};

        allProducts.forEach(p => {
            // Setup for MRR
            if (p.type === 'SUBSCRIPTION') {
                const price = parseFloat(String(p.displayPrice).replace(/[^0-9.]/g, '')) || 0;
                const monthlyPrice = p.durationDays ? (price / (p.durationDays / 30)) : price;
                priceMap[p.productKey] = monthlyPrice;
                if (p.appleProductId) priceMap[p.appleProductId] = monthlyPrice;
                if (p.googleProductId) priceMap[p.googleProductId] = monthlyPrice;
            }

            // Setup for Best Selling Products Names
            productNameMap[p.productKey] = p.displayName;
            if (p.appleProductId) productNameMap[p.appleProductId] = p.displayName;
            if (p.googleProductId) productNameMap[p.googleProductId] = p.displayName;

            // Setup for Revenue Trend Categorization
            let category = "other";
            if (p.type === 'SUBSCRIPTION') category = p.planType || 'subscription';
            if (p.type === 'CONSUMABLE') category = p.consumableType || 'consumable';

            categoryMap[p.productKey] = category;
            if (p.appleProductId) categoryMap[p.appleProductId] = category;
            if (p.googleProductId) categoryMap[p.googleProductId] = category;
        });

        const formattedBestSelling = bestSellingProducts.map(p => ({
            productId: p._id,
            displayName: productNameMap[p._id] || p._id,
            salesCount: p.salesCount,
            revenue: parseFloat(p.revenue.toFixed(2))
        }));

        let totalMRR = 0;
        activeSubscriptions.forEach(group => {
            totalMRR += (priceMap[group._id] || 0) * group.count;
        });

        // Format Trends Plan Distribution
        const validPlans = ["1_MONTH", "3_MONTH", "6_MONTH", "12_MONTH", "LIFETIME", "MILESTONE"];
        const finalPlanDist = planDistribution
            .filter(p => p._id && validPlans.includes(p._id.toUpperCase()))
            .map(p => ({ plan: p._id.toUpperCase(), count: p.count }));

        // Format Revenue Trend Chart
        const formattedRevTrend = {};
        rawRevenueTrend.forEach(item => {
            const day = item._id.day;
            const category = categoryMap[item._id.productId] || 'other';

            if (!formattedRevTrend[day]) {
                formattedRevTrend[day] = {
                    day: day,
                    "1_MONTH": 0,
                    "3_MONTH": 0,
                    "SUPER_KEEN": 0,
                    "BOOST": 0
                };
            }

            if (formattedRevTrend[day][category] === undefined) {
                formattedRevTrend[day][category] = 0;
            }

            formattedRevTrend[day][category] = parseFloat((formattedRevTrend[day][category] + item.amount).toFixed(2));
        });

        // Format Subscriber Growth Trend
        const formattedSubscriberGrowth = {};
        rawSubscriberGrowth.forEach(item => {
            const day = item._id.day;
            const type = item._id.type; // "new" or "cancelled"

            if (!formattedSubscriberGrowth[day]) {
                formattedSubscriberGrowth[day] = {
                    day: day,
                    new: 0,
                    cancelled: 0,
                    net: 0
                };
            }

            formattedSubscriberGrowth[day][type] += item.count;
            // update net each time we modify new or cancelled
            formattedSubscriberGrowth[day].net = formattedSubscriberGrowth[day].new - formattedSubscriberGrowth[day].cancelled;
        });

        const activeCountCurrent = totals[0]?.activeSubscribers || 0;
        const subChange = activeCountStartOfMonth > 0
            ? (((activeCountCurrent - activeCountStartOfMonth) / activeCountStartOfMonth) * 100).toFixed(1)
            : 0;

        return res.json({
            success: true,
            data: {
                kpis: {
                    consumableRevenue: monthlyConsumableRevenueResult[0]?.totalAmount || 0,
                    activeSubscribers: {
                        count: activeCountCurrent,
                        change: `${subChange}%`
                    },
                    mrr: {
                        amount: Math.round(totalMRR),
                        currency: "AUD"
                    },
                    todayRevenue: todayStats[2][0]?.total || 0,
                    conversionRate: totalActiveUsers > 0 ? ((activeCountCurrent / totalActiveUsers * 100).toFixed(2) + "%") : "0%",
                    churnRate: activeCountStartOfMonth > 0 ? ((monthlyCancellations / activeCountStartOfMonth * 100).toFixed(1) + "%") : "0%",
                    milestone: {
                        currentCount: milestoneCount,
                        targetCount: config.milestone.targetUserCount,
                        percentage: (milestoneCount / config.milestone.targetUserCount * 100).toFixed(1)
                    }
                },
                charts: {
                    revenueTrend: Object.values(formattedRevTrend),
                    subscriberGrowth: Object.values(formattedSubscriberGrowth),
                    platformMix: platformMix.map(p => ({ platform: p._id, revenue: p.revenue })),
                    planDistribution: finalPlanDist,
                    bestSellingProducts: formattedBestSelling
                },
                last24HoursActivity: {
                    newSubscriptions: last24hActivity[0],
                    walletPacksBought: last24hActivity[1],
                    cancellations: last24hActivity[2],
                    plansExpiringSoon: last24hActivity[3]
                }
            }
        });
    } catch (err) {
        next(err);
    }
};