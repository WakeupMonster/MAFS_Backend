const appleService = require("../services/apple.service");
const googleService = require("../services/google.service");
const mongoose = require("mongoose");
const subscriptionService = require("../services/subscription.service");
const logger = require("../utils/logger");
const Subscription = require("../../../modules/subscription/models/Subscription");
const SubscriptionTransaction = require("../../../modules/subscription/models/SubscriptionTransaction");
const SubscriptionEvent = require("../../../modules/subscription/models/SubscriptionEvent");
const Product = require("../models_v3/Product");
const SubscriptionConfig = require("../models_v3/SubscriptionConfig");
const UsageService = require("../services/usage.service");

const verifyPurchase = async (req, res, next) => {
  try {
    const { platform, productId, transactionId, purchaseToken } = req.body;
    const userId = req.user._id;

    let purchaseData;

    if (platform === "ios") {
      const result = await appleService.verifyTransaction(transactionId, productId);

      purchaseData = {
        userId: userId,
        platform: "ios",
        productId: result.productId || productId,
        originalTransactionId: result.originalTransactionId,
        transactionId: result.transactionId,
        purchaseDate: result.purchaseDate,
        expiresDate: result.expiresDate,
      };
    } else if (platform === "android") {
      // Step 1: Query the product to determine if it's a subscription or consumable
      const catalogProduct = await Product.findOne({
        $or: [
          { googleProductId: productId },
          { productKey: productId } // fallback 
        ],
        isActive: true
      }).lean();

      if (catalogProduct && catalogProduct.type === 'CONSUMABLE') {
        // Use Consumable Verification Pipeline
        const result = await googleService.verifyConsumable(
          productId,
          purchaseToken
        );

        purchaseData = {
          userId: userId,
          platform: "android",
          productId: productId,
          purchaseToken: purchaseToken,
          orderId: result.orderId,
          purchaseDate: parseInt(result.purchaseTimeMillis) || Date.now(),
          expiresDate: null, // Consumables have no expiry
        };

        // Acknowledge one-time purchase
        await googleService.acknowledgeConsumable(productId, purchaseToken);
      } else {
        // Use Subscription Verification Pipeline
        const result = await googleService.verifySubscription(
          productId,
          purchaseToken
        );

        purchaseData = {
          userId: userId,
          platform: "android",
          productId: productId,
          purchaseToken: purchaseToken,
          orderId: result.orderId,
          purchaseDate: parseInt(result.startTimeMillis),
          expiresDate: parseInt(result.expiryTimeMillis),
        };

        // Acknowledge recurring subscription
        await googleService.acknowledgePurchase(productId, purchaseToken);
      }
    }

    // v3: handlePurchase now returns { type: 'SUBSCRIPTION' | 'CONSUMABLE', ... }
    const result = await subscriptionService.handlePurchase(purchaseData);

    logger.info("Purchase verified", {
      userId: userId,
      platform: platform,
      purchaseType: result.type,
    });

    // v3: Different response based on purchase type
    if (result.type === 'CONSUMABLE') {
      const fullStatus = await UsageService.getUsageStatus(userId);
      return res.json({
        success: true,
        message: `${result.quantity} ${result.consumableType}(s) added to your wallet!`,
        data: {
          purchaseType: "CONSUMABLE",
          consumableType: result.consumableType,
          quantity: result.quantity,
          wallet: result.wallet,
          status: fullStatus.data
        }
      });
    }

    // SUBSCRIPTION response — includes full status snapshot (§1.6.1)
    const sub = result.subscription;
    const fullStatus = await UsageService.getUsageStatus(sub.userId);
    return res.json({
      success: true,
      message: "Subscription verified successfully",
      data: {
        purchaseType: "SUBSCRIPTION",
        subscription: {
          id: sub._id,
          status: sub.status,
          planType: sub.planType,
          platform: sub.platform,
          productId: sub.productId,
          startedAt: sub.startedAt,
          expiresAt: sub.expiresAt,
          autoRenew: sub.autoRenew,
        },
        status: fullStatus.data
      }
    });
  } catch (err) {
    logger.error("Verify purchase error:", err.message);
    return next(err);
  }
};

const restorePurchases = async (req, res, next) => {
  try {
    const { platform, purchases } = req.body;
    const userId = req.user._id;
    const restoredItems = [];

    for (const item of purchases) {
      try {
        let purchaseData;

        if (platform === "ios") {
          const result = await appleService.verifyTransaction(item.transactionId, item.productId);
          purchaseData = {
            userId,
            platform: "ios",
            productId: result.productId || item.productId,
            originalTransactionId: result.originalTransactionId,
            transactionId: result.transactionId,
            purchaseDate: result.purchaseDate,
            expiresDate: result.expiresDate,
          };
        } else {
          // Android restore routing based on product type
          const catalogProduct = await Product.findOne({
            $or: [
              { googleProductId: item.productId },
              { productKey: item.productId }
            ],
            isActive: true
          }).lean();

          if (catalogProduct && catalogProduct.type === 'CONSUMABLE') {
            const result = await googleService.verifyConsumable(item.productId, item.purchaseToken);
            purchaseData = {
              userId,
              platform: "android",
              productId: item.productId,
              purchaseToken: item.purchaseToken,
              orderId: result.orderId,
              purchaseDate: parseInt(result.purchaseTimeMillis) || Date.now(),
              expiresDate: null,
            };
          } else {
            const result = await googleService.verifySubscription(item.productId, item.purchaseToken);
            purchaseData = {
              userId,
              platform: "android",
              productId: item.productId,
              purchaseToken: item.purchaseToken,
              orderId: result.orderId,
              purchaseDate: parseInt(result.startTimeMillis),
              expiresDate: parseInt(result.expiryTimeMillis),
            };
          }
        }

        const result = await subscriptionService.handlePurchase(purchaseData);

        if (result.type === 'SUBSCRIPTION') {
          restoredItems.push({
            productId: item.productId,
            status: result.subscription.status,
            expiresAt: result.subscription.expiresAt
          });
        }
      } catch (err) {
        logger.warn(`Failed to restore item ${item.productId}: ${err.message}`);
      }
    }

    // v3: Fetch full status after restoration
    const fullStatus = await UsageService.getUsageStatus(userId);

    return res.json({
      success: true,
      message: "Purchases restored successfully",
      data: {
        restoredCount: restoredItems.length,
        items: restoredItems,
        status: fullStatus.data
      }
    });
  } catch (err) {
    logger.error("Restore purchases error:", err.message);
    return next(err);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const UsageService = require("../services/usage.service");

    /**
     * v3: Single source of truth for usage, wallet, and entitlements.
     * UsageService handles all the aggregation and formatting for the Flutter app.
     */
    const response = await UsageService.getUsageStatus(req.user._id);

    return res.json(response);
  } catch (err) {
    logger.error("Get status error:", err.message);
    return next(err);
  }
};

const getCatalog = async (req, res, next) => {
  try {
    const [products, config, milestoneCount] = await Promise.all([
      Product.find({ isActive: true }).sort({ sortOrder: 1 }),
      SubscriptionConfig.getOrCreate(),
      Subscription.countDocuments({ planType: 'MILESTONE' })
    ]);

    // Separate into categories
    const subscriptions = products.filter(p => p.type === 'SUBSCRIPTION');
    const consumables = products.filter(p => p.type === 'CONSUMABLE');

    // Dynamic Feature Lists for UI display
    const features = [
      config.premiumLimits.swipesPerDay === -1 ? "Unlimited likes" : `${config.premiumLimits.swipesPerDay} likes per day`,
      config.premiumLimits.superKeensPerDay === -1 ? "Unlimited Super Keens" : `${config.premiumLimits.superKeensPerDay} Super Keens per day`,
      config.premiumLimits.boostsPerMonth === -1 ? "Unlimited Supercharges" : `${config.premiumLimits.boostsPerMonth} Boost per month`,
      config.premiumLimits.rewindsPerDay === -1 ? "Unlimited rewinds" : `${config.premiumLimits.rewindsPerDay} rewinds per day`,
      config.premiumFeatures.seeWhoLikedYou ? "See who liked you" : null,
      config.premiumFeatures.advancedFilters ? "Advanced filters" : null,
      config.premiumFeatures.noAds ? "No ads" : null,
      config.premiumFeatures.passport ? "Passport to any location" : null
    ].filter(Boolean);

    const freeFeatures = [
      `${config.freeLimits.swipesPerDay} likes per day`,
      `${config.freeLimits.superKeensPerWeek} Super Keen per week`,
      `${config.freeLimits.rewindsPerDay} rewind per day`,
      `${config.freeLimits.boostsPerMonth} Boost per month`,
      "Basic filters"
    ];

    return res.json({
      success: true,
      message: "Catalog fetched",
      data: {
        subscriptions: subscriptions.map(sub => ({
          ...sub.toObject(),
          features,
          allocations: {
            likes: config.premiumLimits.swipesPerDay,         // -1 = Unlimited
            superKeens: config.premiumLimits.superKeensPerDay,
            boosts: config.premiumLimits.boostsPerMonth,
            rewinds: config.premiumLimits.rewindsPerDay        // -1 = Unlimited
          }
        })),
        consumables: {
          superKeens: consumables.filter(c => c.consumableType === 'SUPER_KEEN').map(c => c.toObject()),
          boosts: consumables.filter(c => c.consumableType === 'BOOST').map(c => c.toObject())
        },
        milestone: {
          target: config.milestone.targetUserCount,
          currentCount: milestoneCount,
          isActive: config.milestone.isActive
        },
        freeFeatures
      }
    });
  } catch (err) {
    logger.error("Get catalog error:", err.message);
    return next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const { transactions, total } = await subscriptionService.getTransactionHistory(
      req.user._id,
      limit
    );

    return res.json({
      success: true,
      message: "Transaction history fetched",
      data: {
        transactions: transactions,
        hasMore: transactions.length < total,
        total: total
      }
    });
  } catch (err) {
    logger.error("Get history error:", err.message);
    return next(err);
  }
};

const getSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.getUserSubscription(req.user._id);

    return res.json({
      success: true,
      subscription: sub || null,
    });
  } catch (err) {
    logger.error("Get subscription error:", err.message);
    return next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    // Status wise count
    const statusStats = await Subscription.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const planStats = await Subscription.aggregate([
      {
        $match: { status: "ACTIVE" },
      },
      {
        $sort: { createdAt: -1 }
      },
      {

        $group: {
          _id: "$userId", // Dhyan dein: Agar database schema mein field ka naam "user" hai, toh usko "$user" karein
          planType: { $first: "$productId" }
        }
      },
      {
        $group: {
          _id: "$productId",
          count: { $sum: 1 },
        },
      },
    ]);

    const platformStats = await Subscription.aggregate([
      {
        $match: { status: "ACTIVE" },
      },
      {
        $group: {
          _id: "$platform",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalSubscribers = await Subscription.countDocuments();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayNew = await Subscription.countDocuments({
      createdAt: { $gte: todayStart },
    });

    const todayCancelled = await Subscription.countDocuments({
      cancelledAt: { $gte: todayStart },
    });

    const todayRevenue = await SubscriptionTransaction.aggregate([
      {
        $match: {
          eventType: { $in: ["PURCHASE", "RENEW"] },
          occurredAt: { $gte: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap = {};
    statusStats.forEach((s) => {
      statusMap[s._id] = s.count;
    });

    const planMap = {};
    planStats.forEach((p) => {
      planMap[p._id] = p.count;
    });

    const platformMap = {};
    platformStats.forEach((p) => {
      platformMap[p._id] = p.count;
    });

    return res.json({
      success: true,
      statsKPI: {
        total: totalSubscribers,
        active: statusMap["ACTIVE"] || 0,
        grace: statusMap["GRACE"] || 0,
        expired: statusMap["EXPIRED"] || 0,
        cancelled: statusMap["CANCELLED"] || 0,
        revoked: statusMap["REVOKED"] || 0,
        paused: statusMap["PAUSED"] || 0,
        pending: statusMap["PENDING"] || 0,

        byPlan: {
          monthly: planMap["monthly"] || 0,
          yearly: planMap["yearly"] || 0,
          weekly: planMap["weekly"] || 0,
        },

        byPlatform: {
          ios: platformMap["ios"] || 0,
          android: platformMap["android"] || 0,
        },

        today: {
          newSubscriptions: todayNew,
          cancellations: todayCancelled,
          revenue: todayRevenue[0] ? todayRevenue[0].total : 0,
          transactions: todayRevenue[0] ? todayRevenue[0].count : 0,
        },
      },
    });
  } catch (err) {
    logger.error("Admin stats error:", err.message);
    return next(err);
  }
};

// const getAllSubscriptions = async (req, res, next) => {
//   try {
//     const {
//       status,
//       plan,
//       platform,
//       page = 1,
//       limit = 20,
//       search,
//       sortBy = "createdAt",
//       sortOrder = "desc",
//     } = req.query;

//     const filter = {};

//     if (status) {
//       filter.status = status;
//     }
//     if (plan) {
//       filter.planType = plan;
//     }
//     if (platform) {
//       filter.platform = platform;
//     }

//     if (search) {
//       filter.$or = [
//         { originalTransactionId: { $regex: search, $options: "i" } },
//         { purchaseToken: { $regex: search, $options: "i" } },
//         { orderId: { $regex: search, $options: "i" } },
//       ];

//       if (search.match(/^[0-9a-fA-F]{24}$/)) {
//         filter.$or.push({ userId: search });
//       }
//     }

//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);
//     const skip = (pageNum - 1) * limitNum;

//     const sort = {};
//     sort[sortBy] = sortOrder === "asc" ? 1 : -1;

//     const [subscriptions, total] = await Promise.all([
//       Subscription.find(filter)
//         .populate("userId", "nickname email phone")
//         .sort(sort)
//         .skip(skip)
//         .limit(limitNum)
//         .lean(),
//       Subscription.countDocuments(filter),
//     ]);

//     return res.json({
//       success: true,
//       subscriptions: subscriptions,
//       pagination: {
//         currentPage: pageNum,
//         totalPages: Math.ceil(total / limitNum),
//         totalItems: total,
//         itemsPerPage: limitNum,
//         hasNext: pageNum * limitNum < total,
//         hasPrev: pageNum > 1,
//       },
//     });
//   } catch (err) {
//     logger.error("Admin get subscriptions error:", err.message);
//     return next(err);
//   }
// };

const getAllSubscriptions = async (req, res, next) => {
  try {
    const {
      status,
      plan,
      platform,
      page = 1,
      limit = 20,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 1. Build the Match Filter (Direct Subscription Fields)
    const matchStage = {};
    if (status) matchStage.status = status;
    if (plan) matchStage.planType = plan;
    if (platform) matchStage.platform = platform;

    // 2. Aggregation Pipeline
    const pipeline = [
      { $match: matchStage },

      // JOIN with Profiles model (assuming collection name is 'profiles')
      {
        $lookup: {
          from: "profiles",
          localField: "userId",
          foreignField: "userId",
          as: "profile",
        },
      },

      // Flatten the userDetails array
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users", // Ensure this matches your collection name (usually plural)
          localField: "userId",
          foreignField: "_id", // Usually users join on _id unless userId is a custom field
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // 3. Advanced Searching (Search across Subscriptions AND Profiles)
      ...(search
        ? [
          {
            $match: {
              $or: [
                { originalTransactionId: { $regex: search, $options: "i" } },
                { orderId: { $regex: search, $options: "i" } },
                { "profile.nickname": { $regex: search, $options: "i" } },
                { "userDetails.email": { $regex: search, $options: "i" } },
                { "userDetails.phone": { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
        : []),

      // 4. Multi-faceted Output (Data + Pagination in one query)
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                autoRenew: 1,
                user: {
                  userId: "$userDetails._id",
                  avatar: {
                    $ifNull: [{ $arrayElemAt: ["$profile.photos", 0] }, null],
                  },
                  nickname: { $ifNull: ["$profile.nickname", "-"] },
                  email: { $ifNull: ["$userDetails.email", "-"] },
                  phone: { $ifNull: ["$userDetails.phone", "-"] },
                },
                platform: 1,
                productId: 1,
                planType: 1,
                status: 1,
                retryCount: 1,
                statusHistory: 1,
                startedAt: 1,
                expiresAt: 1,
                originalTransactionId: 1,
                latestTransactionId: 1,
                isInFamilySharing: 1,
                offerType: 1,
                previousStatus: 1,
                orderId: 1,
                environment: 1,
                createdAt: 1,
                updatedAt: 1,
                // Flattened Data for Frontend
              },
            },
          ],
        },
      },
    ];

    const result = await Subscription.aggregate(pipeline);

    // 5. Cleanup Facet Results
    const subscriptions = result[0].data;
    const total = result[0].metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      message: "subscriptions fetched successfully",
      data: {
        subscriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages,
          total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1,
        },
      }
    });
  } catch (err) {
    logger.error("Admin aggregation error:", err.message);
    return next(err);
  }
};

// const getUserSubscriptionDetail = async (req, res, next) => {
//   try {
//     const { userId } = req.params;

//     const subscription = await Subscription.findOne({ userId: userId })
//       .populate("userId", "name email phone profileImage")
//       .sort({ createdAt: -1 })
//       .lean();

//     if (!subscription) {
//       return res.json({
//         success: true,
//         subscription: null,
//         transactions: [],
//         events: [],
//         message: "No subscription found for this user",
//       });
//     }

//     const transactions = await SubscriptionTransaction.find({
//       userId: userId,
//     })
//       .sort({ occurredAt: -1 })
//       .lean();

//     const events = await SubscriptionEvent.find({
//       subscriptionId: subscription._id,
//     })
//       .sort({ receivedAt: -1 })
//       .limit(50)
//       .lean();

//     return res.json({
//       success: true,
//       subscription: subscription,
//       transactions: transactions,
//       events: events,
//       summary: {
//         totalPaid: transactions
//           .filter((t) => t.eventType === "PURCHASE" || t.eventType === "RENEW")
//           .reduce((sum, t) => sum + (t.amount || 0), 0),
//         totalRefunded: transactions
//           .filter((t) => t.eventType === "REFUND")
//           .reduce((sum, t) => sum + (t.refundAmount || 0), 0),
//         totalTransactions: transactions.length,
//         renewalCount: transactions.filter((t) => t.eventType === "RENEW")
//           .length,
//         daysSinceStart: Math.floor(
//           (new Date() - new Date(subscription.startedAt)) /
//             (1000 * 60 * 60 * 24)
//         ),
//       },
//     });
//   } catch (err) {
//     logger.error("Admin user detail error:", err.message);
//     return next(err);
//   }
// };

const getUserSubscriptionDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const result = await Subscription.aggregate([
      // 1. Find the latest subscription for this user
      { $match: { userId: userObjectId } },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },

      // 2. Lookup Profile data (for nickname and photos)
      {
        $lookup: {
          from: "profiles",
          localField: "userId",
          foreignField: "userId",
          as: "profileData",
        },
      },
      { $unwind: { path: "$profileData", preserveNullAndEmptyArrays: true } },

      // 3. Lookup User data (for email and phone)
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

      // 4. Lookup Transactions for the Summary
      {
        $lookup: {
          from: "subscriptiontransactions", // Check your exact collection name
          localField: "userId",
          foreignField: "userId",
          as: "transactions",
        },
      },

      // 5. Lookup Events
      {
        $lookup: {
          from: "subscriptionevents", // Check your exact collection name
          let: { subId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$subscriptionId", "$$subId"] } } },
            { $sort: { receivedAt: -1 } },
            { $limit: 50 },
          ],
          as: "events",
        },
      },

      // 6. Project and Structure the Output
      {
        $project: {
          // All subscription fields
          _id: 1,
          platform: 1,
          productId: 1,
          planType: 1,
          status: 1,
          autoRenew: 1,
          startedAt: 1,
          expiresAt: 1,
          originalTransactionId: 1,
          latestTransactionId: 1,
          retryCount: 1,
          orderId: 1,
          statusHistory: 1,
          environment: 1,
          isInFamilySharing: 1,
          offerType: 1,
          previousStatus: 1,
          createdAt: 1,
          updatedAt: 1,

          // Custom nested user object
          user: {
            userId: "$userId",
            nickname: { $ifNull: ["$profileData.nickname", "User"] },
            avatar: { $arrayElemAt: ["$profileData.photos", 0] },
            email: { $ifNull: ["$userData.email", "-"] },
            phone: { $ifNull: ["$userData.phone", "-"] },
          },

          // Raw Lists
          transactions: 1,
          events: 1,

          // Summary Calculations
          summary: {
            totalPaid: {
              $reduce: {
                input: {
                  $filter: {
                    input: "$transactions",
                    as: "t",
                    cond: { $in: ["$$t.eventType", ["PURCHASE", "RENEW"]] },
                  },
                },
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.amount", 0] }] },
              },
            },
            totalRefunded: {
              $reduce: {
                input: {
                  $filter: {
                    input: "$transactions",
                    as: "t",
                    cond: { $eq: ["$$t.eventType", "REFUND"] },
                  },
                },
                initialValue: 0,
                in: {
                  $add: ["$$value", { $ifNull: ["$$this.refundAmount", 0] }],
                },
              },
            },
            totalTransactions: { $size: "$transactions" },
            renewalCount: {
              $size: {
                $filter: {
                  input: "$transactions",
                  as: "t",
                  cond: { $eq: ["$$t.eventType", "RENEW"] },
                },
              },
            },
            daysSinceStart: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$startedAt"] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: "No subscription found",
      });
    }

    return res.json({
      success: true,
      message: "subscription detail fetched successfully",
      data: result[0],
    });
  } catch (err) {
    logger.error("Admin user detail aggregation error:", err.message);
    return next(err);
  }
};

const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    let start;
    let end = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (period) {
        case "today":
          start = new Date();
          start.setHours(0, 0, 0, 0);
          break;
        case "week":
          start = new Date();
          start.setDate(start.getDate() - 7);
          break;
        case "month":
          start = new Date();
          start.setMonth(start.getMonth() - 1);
          break;
        case "year":
          start = new Date();
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start = new Date();
          start.setMonth(start.getMonth() - 1);
      }
    }

    const revenueByType = await SubscriptionTransaction.aggregate([
      {
        $match: {
          occurredAt: { $gte: start, $lte: end },
          eventType: { $in: ["PURCHASE", "RENEW", "REFUND"] },
        },
      },
      {
        $group: {
          _id: "$eventType",
          totalAmount: { $sum: "$amount" },
          totalRefund: { $sum: "$refundAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyRevenue = await SubscriptionTransaction.aggregate([
      {
        $match: {
          occurredAt: { $gte: start, $lte: end },
          eventType: { $in: ["PURCHASE", "RENEW"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" },
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueByPlan = await SubscriptionTransaction.aggregate([
      {
        $match: {
          occurredAt: { $gte: start, $lte: end },
          eventType: { $in: ["PURCHASE", "RENEW"] },
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: "$subscription" },
      {
        $group: {
          _id: "$subscription.planType",
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const revenueByPlatform = await SubscriptionTransaction.aggregate([
      {
        $match: {
          occurredAt: { $gte: start, $lte: end },
          eventType: { $in: ["PURCHASE", "RENEW"] },
        },
      },
      {
        $group: {
          _id: "$platform",
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const typeMap = {};
    revenueByType.forEach((r) => {
      typeMap[r._id] = r;
    });

    const purchases = typeMap["PURCHASE"] || { totalAmount: 0, count: 0 };
    const renewals = typeMap["RENEW"] || { totalAmount: 0, count: 0 };
    const refunds = typeMap["REFUND"] || { totalRefund: 0, count: 0 };

    const totalRevenue = purchases.totalAmount + renewals.totalAmount;
    const netRevenue = totalRevenue - (refunds.totalRefund || 0);

    return res.json({
      success: true,
      message: "Revenue analytics fetched successfully",
      data: {
        period: { start: start, end: end },
        revenue: {
          total: totalRevenue,
          net: netRevenue,
          purchases: {
            amount: purchases.totalAmount,
            count: purchases.count,
          },
          renewals: {
            amount: renewals.totalAmount,
            count: renewals.count,
          },
          refunds: {
            amount: refunds.totalRefund || 0,
            count: refunds.count,
          },
        },
        daily: dailyRevenue,
        byPlan: revenueByPlan,
        byPlatform: revenueByPlatform,
      },
    });
  } catch (err) {
    logger.error("Admin revenue error:", err.message);
    return next(err);
  }
};

const getCancellationAnalytics = async (req, res, next) => {
  try {
    const { period = "month" } = req.query;

    let start = new Date();
    if (period === "week") start.setDate(start.getDate() - 7);
    else if (period === "month") start.setMonth(start.getMonth() - 1);
    else if (period === "year") start.setFullYear(start.getFullYear() - 1);

    const byReason = await Subscription.aggregate([
      {
        $match: {
          cancelledAt: { $gte: start },
          cancellationReason: { $exists: true },
        },
      },
      {
        $group: {
          _id: "$cancellationReason",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const byPlan = await Subscription.aggregate([
      {
        $match: { cancelledAt: { $gte: start } },
      },
      {
        $group: {
          _id: "$planType",
          count: { $sum: 1 },
        },
      },
    ]);

    const byPlatform = await Subscription.aggregate([
      {
        $match: { cancelledAt: { $gte: start } },
      },
      {
        $group: {
          _id: "$platform",
          count: { $sum: 1 },
        },
      },
    ]);

    const daily = await Subscription.aggregate([
      {
        $match: { cancelledAt: { $gte: start } },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$cancelledAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalCancelled = byReason.reduce((sum, r) => sum + r.count, 0);

    return res.json({
      success: true,
      message: "Cancellation analytics fetched successfully",
      data: {
        total: totalCancelled,
        byReason: byReason,
        byPlan: byPlan,
        byPlatform: byPlatform,
        daily: daily,
      },
    });
  } catch (err) {
    logger.error("Admin cancellation error:", err.message);
    return next(err);
  }
};

const getAtRiskUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      Subscription.find({
        status: "GRACE",
      })
        .populate("userId", "name email phone")
        .sort({ gracePeriodEndsAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Subscription.countDocuments({ status: "GRACE" }),
    ]);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        total,
      },
      atRiskUsers: users.map((u) => ({
        userId: u.userId,
        plan: u.planType,
        platform: u.platform,
        retryCount: u.retryCount,
        gracePeriodEndsAt: u.gracePeriodEndsAt,
        daysRemaining: Math.max(
          0,
          Math.ceil(
            (new Date(u.gracePeriodEndsAt) - new Date()) / (1000 * 60 * 60 * 24)
          )
        ),
        startedAt: u.startedAt,
      })),
    });
  } catch (err) {
    logger.error("Admin at risk error:", err.message);
    return next(err);
  }
};

const getWebhookEvents = async (req, res, next) => {
  try {
    const { platform, eventType, processed, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (platform) filter.platform = platform;
    if (eventType) filter.eventType = eventType;
    if (processed !== undefined) filter.processed = processed === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      SubscriptionEvent.find(filter)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SubscriptionEvent.countDocuments(filter),
    ]);

    const failedCount = await SubscriptionEvent.countDocuments({
      processed: false,
      "error.retryCount": { $gte: 5 },
    });

    return res.json({
      success: true,
      failedCount: failedCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
      },
      events: events,
    });
  } catch (err) {
    logger.error("Admin webhook events error:", err.message);
    return next(err);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const {
      eventType,
      platform,
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const filter = {};
    if (eventType) filter.eventType = eventType;
    if (platform) filter.platform = platform;
    if (startDate && endDate) {
      filter.occurredAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      SubscriptionTransaction.find(filter)
        .populate("userId", "nickname email phone")
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SubscriptionTransaction.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
      },
      transactions: transactions,
    });
  } catch (err) {
    logger.error("Admin transactions error:", err.message);
    return next(err);
  }
};

const makeMePremiumTemp = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Purane agar koi hain toh unko expire kardo
    await Subscription.updateMany({ userId }, { status: 'EXPIRED' });

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const subscription = await Subscription.create({
      userId: userId,
      platform: "admin_granted",
      productId: "test_premium_plan_1",
      planType: "monthly",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: oneMonthFromNow,
      environment: "sandbox",
    });

    return res.json({ success: true, message: "Aap ab 1 mahine ke liye premium hain!", data: subscription });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  verifyPurchase,
  getStatus,
  getHistory,
  getSubscription,
  getStats,
  getAllSubscriptions,
  getUserSubscriptionDetail,
  getRevenueAnalytics,
  getCancellationAnalytics,
  getAtRiskUsers,
  getWebhookEvents,
  getAllTransactions,
  makeMePremiumTemp,
  getCatalog,
  restorePurchases
};
