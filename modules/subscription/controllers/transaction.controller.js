const SubscriptionTransaction = require("../models/SubscriptionTransaction");
const Product = require("../models_v3/Product");
const User = require("../../auth/auth.model");
const Profile = require("../../profile/profile.model");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { stringify } = require("csv-stringify"); // ✅ Import for streaming CSV

/**
 * Commission rates for Net Revenue calculation.
 * Apple/Google take 30% standard, 15% for Small Business Program.
 */
const COMMISSION_RATES = {
  ios: 0.3, // Apple 30% (change to 0.15 for Small Business Program)
  android: 0.3, // Google 30% (change to 0.15 for Small Business Program)
};

/**
 * 1. GET /transactions
 * Full transaction list with filters, sorting, search, and pagination.
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

    if (status === "refunded") filter.eventType = "REFUND";

    // Search: User email, User nickname, Transaction ID / Order ID, Product ID
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const matchedUsers = await User.find({ email: searchRegex })
        .select("_id")
        .lean();
      const matchedProfiles = await Profile.find({
        $or: [{ nickname: searchRegex }, { fullName: searchRegex }],
      })
        .select("userId")
        .lean();
      const userIds = [
        ...matchedUsers.map((u) => u._id),
        ...matchedProfiles.map((p) => p.userId),
      ];
      const orConditions = [
        { transactionId: searchRegex },
        { orderId: searchRegex },
        { productId: searchRegex },
      ];
      if (userIds.length > 0) orConditions.push({ userId: { $in: userIds } });
      if (mongoose.isValidObjectId(search))
        orConditions.push({ userId: new mongoose.Types.ObjectId(search) });
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
    const enrichedTransactions = transactions.map((txn) => {
      const grossAmount = txn.amount || 0;
      const commissionRate = COMMISSION_RATES[txn.platform] || 0.3;
      return {
        _id: txn._id,
        date: txn.occurredAt,
        user: txn.userId,
        productId: txn.productId,
        eventType: txn.eventType,
        grossAmount: grossAmount,
        netAmount: parseFloat((grossAmount * (1 - commissionRate)).toFixed(2)),
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
      SubscriptionTransaction.aggregate([
        { $match: { eventType: { $in: revenueEventTypes }, ...dateFilter } },
        {
          $group: {
            _id: "$platform",
            grossRevenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      SubscriptionTransaction.aggregate([
        { $match: { eventType: { $in: revenueEventTypes }, ...dateFilter } },
        {
          $group: {
            _id: "$productId",
            grossRevenue: { $sum: "$amount" },
            sales: { $sum: 1 },
          },
        },
        { $sort: { grossRevenue: -1 } },
      ]),
      SubscriptionTransaction.aggregate([
        { $match: { eventType: "REFUND", ...dateFilter } },
        {
          $group: {
            _id: null,
            totalRefunds: { $sum: 1 },
            totalRefundAmount: {
              $sum: { $ifNull: ["$refundAmount", "$amount"] },
            },
          },
        },
      ]),
      SubscriptionTransaction.countDocuments({
        eventType: { $in: [...revenueEventTypes, "REFUND"] },
        ...dateFilter,
      }),
    ]);

    let totalGross = 0;
    let totalNet = 0;
    const platformBreakdown = grossByPlatform.map((p) => {
      const commissionRate = COMMISSION_RATES[p._id] || 0.3;
      const net = parseFloat(
        (p.grossRevenue * (1 - commissionRate)).toFixed(2),
      );
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

    const allProducts = await Product.find().lean();
    const productNameMap = {};
    allProducts.forEach((p) => {
      productNameMap[p.productKey] = p.displayName;
      if (p.appleProductId) productNameMap[p.appleProductId] = p.displayName;
      if (p.googleProductId) productNameMap[p.googleProductId] = p.displayName;
    });

    const productBreakdown = revenueByProduct.map((p) => ({
      productId: p._id,
      displayName: productNameMap[p._id] || p._id,
      grossRevenue: parseFloat(p.grossRevenue.toFixed(2)),
      sales: p.sales,
    }));

    const totalRefunds = refundStats[0]?.totalRefunds || 0;
    const totalRefundAmount = refundStats[0]?.totalRefundAmount || 0;
    const refundRate =
      totalTransactionCount > 0
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
          isHealthy: refundRate < 5,
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
 * Export transactions as CSV with streaming and progress markers
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

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions_${new Date().toISOString().split("T")[0]}.csv`,
    );

    const csvStream = stringify({
      header: true,
      columns: {
        date: "Date",
        nickname: "User Nickname",
        email: "User Email",
        phone: "User Phone",
        productId: "Product ID",
        type: "Type",
        gross: "Gross Amount (AUD)",
        commission: "Commission (AUD)",
        net: "Net Amount (AUD)",
        platform: "Platform",
        txnId: "Transaction ID",
        refundReason: "Refund Reason",
      },
    });

    csvStream.pipe(res);

    const formatDate = (d) => {
      if (!d) return "";
      return new Date(d).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const totalTransactions =
      await SubscriptionTransaction.countDocuments(filter);
    const pipeline = [
      { $match: filter },
      { $sort: { occurredAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "userId",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          occurredAt: 1,
          productId: 1,
          eventType: 1,
          amount: 1,
          platform: 1,
          transactionId: 1,
          orderId: 1,
          refundReason: 1,
          nickname: "$profile.nickname",
          email: "$user.email",
          phone: "$user.phone",
        },
      },
    ];

    const cursor = SubscriptionTransaction.aggregate(pipeline).cursor({
      batchSize: 5000,
    });
    let processedCount = 0;
    let lastSentProgress = -1;

    for await (const doc of cursor) {
      processedCount++;
      const currentProgress = Math.floor(
        (processedCount / totalTransactions) * 100,
      );

      if (currentProgress > lastSentProgress) {
        lastSentProgress = currentProgress;
        res.write(`\n---PROG:${currentProgress}---\n`);
      }

      const gross = doc.amount || 0;
      const commissionRate = COMMISSION_RATES[doc.platform] || 0.3;
      const commission = (gross * commissionRate).toFixed(2);
      const net = (gross * (1 - commissionRate)).toFixed(2);

      csvStream.write({
        date: formatDate(doc.occurredAt),
        nickname: doc.nickname || "N/A",
        email: doc.email || "N/A",
        phone: doc.phone ? `\t${doc.phone}` : "N/A",
        productId: doc.productId || "",
        type: doc.eventType || "",
        gross: gross.toFixed(2),
        commission: commission,
        net: net,
        platform: doc.platform || "",
        txnId: doc.transactionId || doc.orderId || "",
        refundReason: doc.refundReason || "",
      });
    }

    csvStream.end();
  } catch (err) {
    logger.error("Transaction export error:", err.message);
    if (!res.headersSent) next(err);
    else res.end();
  }
};
