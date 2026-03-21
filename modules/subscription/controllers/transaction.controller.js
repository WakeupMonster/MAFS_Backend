const SubscriptionTransaction = require("../models/SubscriptionTransaction");
const Product = require("../models_v3/Product");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Commission rates for Net Revenue calculation.
 * Apple/Google take 30% standard, 15% for Small Business Program.
 * Admin can adjust this later via config if needed.
 */
const COMMISSION_RATES = {
    ios: 0.30,      // Apple 30% (change to 0.15 for Small Business Program)
    android: 0.30,  // Google 30% (change to 0.15 for Small Business Program)
};

/**
 * 1. GET /transactions
 * Full transaction list with filters, sorting, search, and pagination.
 * Includes Net Revenue calculation (after Apple/Google commission).
 */
exports.getTransactions = async (req, res, next) => {
    try {
        const {
            eventType,
            platform,
            productId,
            status,
            search,
            page = 1,
            limit = 20,
            startDate,
            endDate,
            sortBy = "occurredAt",
            sortOrder = "desc",
        } = req.query;

        // Build filter
        const filter = {};
        if (eventType) filter.eventType = eventType;
        if (platform) filter.platform = platform;
        if (productId) filter.productId = productId;
        if (startDate && endDate) {
            filter.occurredAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        } else if (startDate) {
            filter.occurredAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            filter.occurredAt = { $lte: new Date(endDate) };
        }

        // Refund status filter
        if (status === "refunded") {
            filter.eventType = "REFUND";
        }

        // Search: User email, User nickname, Transaction ID / Order ID, Product ID
        if (search) {
            const searchRegex = new RegExp(search, 'i');

            // Find matching Users (by email)
            const matchedUsers = await User.find({
                email: searchRegex
            }).select('_id').lean();

            // Find matching Profiles (by nickname)
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

            // Combine: user match OR direct transaction field match
            const orConditions = [
                { transactionId: searchRegex },
                { orderId: searchRegex },
                { productId: searchRegex },
            ];

            if (userIds.length > 0) {
                orConditions.push({ userId: { $in: userIds } });
            }

            // Direct userId match if search is a valid ObjectId
            if (mongoose.isValidObjectId(search)) {
                orConditions.push({ userId: new mongoose.Types.ObjectId(search) });
            }

            filter.$or = orConditions;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        const [transactions, total] = await Promise.all([
            SubscriptionTransaction.find(filter)
                .populate("userId", "nickname email phone profilePic")
                .sort(sortObj)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SubscriptionTransaction.countDocuments(filter),
        ]);

        // Enrich transactions with Net Revenue
        const enrichedTransactions = transactions.map(txn => {
            const grossAmount = txn.amount || 0;
            const commissionRate = COMMISSION_RATES[txn.platform] || 0.30;
            const netAmount = parseFloat((grossAmount * (1 - commissionRate)).toFixed(2));

            return {
                _id: txn._id,
                date: txn.occurredAt,
                user: txn.userId,
                productId: txn.productId,
                eventType: txn.eventType,
                grossAmount: grossAmount,
                netAmount: netAmount,
                commission: parseFloat((grossAmount * commissionRate).toFixed(2)),
                currency: txn.currency || "AUD",
                platform: txn.platform,
                transactionId: txn.transactionId || txn.orderId || null,
                refundReason: txn.refundReason || null,
                refundAmount: txn.refundAmount || null,
                createdAt: txn.createdAt,
            };
        });

        return res.json({
            success: true,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
            },
            transactions: enrichedTransactions,
        });
    } catch (err) {
        logger.error("Transaction list error:", err.message);
        next(err);
    }
};

/**
 * 2. GET /transactions/summary
 * Revenue Summary Cards:
 *   - Gross Revenue vs Net Revenue
 *   - Revenue by Product
 *   - Revenue by Platform
 *   - Refund Rate
 */
exports.getTransactionSummary = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.occurredAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const revenueEventTypes = ["PURCHASE", "RENEW", "CONSUMABLE_PURCHASE"];

        const [
            grossByPlatform,
            revenueByProduct,
            refundStats,
            totalTransactionCount,
        ] = await Promise.all([
            // 1. Gross Revenue grouped by Platform
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        eventType: { $in: revenueEventTypes },
                        ...dateFilter,
                    },
                },
                {
                    $group: {
                        _id: "$platform",
                        grossRevenue: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            // 2. Revenue by Product
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        eventType: { $in: revenueEventTypes },
                        ...dateFilter,
                    },
                },
                {
                    $group: {
                        _id: "$productId",
                        grossRevenue: { $sum: "$amount" },
                        sales: { $sum: 1 },
                    },
                },
                { $sort: { grossRevenue: -1 } },
            ]),
            // 3. Refund Stats
            SubscriptionTransaction.aggregate([
                {
                    $match: {
                        eventType: "REFUND",
                        ...dateFilter,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalRefunds: { $sum: 1 },
                        totalRefundAmount: { $sum: { $ifNull: ["$refundAmount", "$amount"] } },
                    },
                },
            ]),
            // 4. Total revenue transactions count (for refund rate)
            SubscriptionTransaction.countDocuments({
                eventType: { $in: [...revenueEventTypes, "REFUND"] },
                ...dateFilter,
            }),
        ]);

        // Calculate totals
        let totalGross = 0;
        let totalNet = 0;
        const platformBreakdown = grossByPlatform.map(p => {
            const commissionRate = COMMISSION_RATES[p._id] || 0.30;
            const net = parseFloat((p.grossRevenue * (1 - commissionRate)).toFixed(2));
            totalGross += p.grossRevenue;
            totalNet += net;
            return {
                platform: p._id,
                grossRevenue: parseFloat(p.grossRevenue.toFixed(2)),
                netRevenue: net,
                commission: parseFloat((p.grossRevenue * commissionRate).toFixed(2)),
                commissionRate: `${(commissionRate * 100).toFixed(0)}%`,
                transactionCount: p.count,
            };
        });

        // Product breakdown — lookup display names
        const allProducts = await Product.find().lean();
        const productNameMap = {};
        allProducts.forEach(p => {
            productNameMap[p.productKey] = p.displayName;
            if (p.appleProductId) productNameMap[p.appleProductId] = p.displayName;
            if (p.googleProductId) productNameMap[p.googleProductId] = p.displayName;
        });

        const productBreakdown = revenueByProduct.map(p => ({
            productId: p._id,
            displayName: productNameMap[p._id] || p._id,
            grossRevenue: parseFloat(p.grossRevenue.toFixed(2)),
            sales: p.sales,
        }));

        // Refund Rate
        const totalRefunds = refundStats[0]?.totalRefunds || 0;
        const totalRefundAmount = refundStats[0]?.totalRefundAmount || 0;
        const refundRate = totalTransactionCount > 0
            ? parseFloat(((totalRefunds / totalTransactionCount) * 100).toFixed(2))
            : 0;

        return res.json({
            success: true,
            data: {
                overview: {
                    grossRevenue: parseFloat(totalGross.toFixed(2)),
                    netRevenue: parseFloat(totalNet.toFixed(2)),
                    totalCommission: parseFloat((totalGross - totalNet).toFixed(2)),
                    currency: "AUD",
                },
                refunds: {
                    totalRefunds,
                    totalRefundAmount: parseFloat(totalRefundAmount.toFixed(2)),
                    refundRate: `${refundRate}%`,
                    isHealthy: refundRate < 5,  // <5% = Healthy, >10% = Dangerous
                },
                revenueByPlatform: platformBreakdown,
                revenueByProduct: productBreakdown,
            },
        });
    } catch (err) {
        logger.error("Transaction summary error:", err.message);
        next(err);
    }
};

/**
 * 3. GET /transactions/export
 * Export all transactions as CSV.
 */
exports.exportTransactionsCSV = async (req, res, next) => {
    try {
        const { startDate, endDate, eventType, platform } = req.query;

        const filter = {};
        if (eventType) filter.eventType = eventType;
        if (platform) filter.platform = platform;
        if (startDate && endDate) {
            filter.occurredAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const transactions = await SubscriptionTransaction.find(filter)
            .populate("userId", "nickname email phone")
            .sort({ occurredAt: -1 })
            .lean();

        // CSV Header
        const headers = [
            "Date",
            "User Nickname",
            "User Email",
            "Product ID",
            "Type",
            "Gross Amount (AUD)",
            "Commission",
            "Net Amount (AUD)",
            "Platform",
            "Transaction ID",
            "Refund Reason",
        ].join(",");

        // CSV Rows
        const rows = transactions.map(txn => {
            const gross = txn.amount || 0;
            const commissionRate = COMMISSION_RATES[txn.platform] || 0.30;
            const commission = (gross * commissionRate).toFixed(2);
            const net = (gross * (1 - commissionRate)).toFixed(2);

            return [
                txn.occurredAt ? new Date(txn.occurredAt).toISOString() : "",
                txn.userId?.nickname || "N/A",
                txn.userId?.email || "N/A",
                txn.productId || "",
                txn.eventType || "",
                gross.toFixed(2),
                commission,
                net,
                txn.platform || "",
                txn.transactionId || txn.orderId || "",
                txn.refundReason || "",
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",");
        });

        const csv = [headers, ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=transactions_${new Date().toISOString().split("T")[0]}.csv`);
        return res.send(csv);
    } catch (err) {
        logger.error("Transaction export error:", err.message);
        next(err);
    }
};
