const GiveawayCampaign = require("./giveawayCampaign.model");
const GiveawayWinHistory = require("./giveawayWinHistory.model");
const notificationService = require("../../notifications/notification.service");
const User = require("../../../modules/auth/auth.model");
const Prize = require("./prize.model");
const utils = require("../../auth/auth.utils");
const Profile = require("../../profile/profile.model"); // adjust path

module.exports.getAllPrizes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const type = req.query.type || "";

    // 1. Build Match Stage (Filtering)
    const matchStage = {};
    if (type && type !== "ALL") {
      matchStage.type = type;
    }
    if (search) {
      matchStage.title = { $regex: search, $options: "i" };
    }

    // 2. Execute Aggregation
    const result = await Prize.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // Metadata: Count total documents matching the filters
          metadata: [{ $count: "total" }],
          // Data: Apply sorting and pagination
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
        },
      },
    ]);

    // 3. Extract results from Facet
    const prizes = result[0].data;
    const totalPrizes = result[0].metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalPrizes / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        totalPrizes,
        page,
        limit,
        totalPages,
      },
      data: prizes,
    });
  } catch (err) {
    console.error("Fetch Prizes Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch prizes",
      error: err.message,
    });
  }
};

module.exports.createPrize = async (req, res) => {
  try {
    const { title, type, value, description, spinWheelLabel, supportiveItems } =
      req.body;

    if (!supportiveItems || supportiveItems.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 supportive items are required",
      });
    }

    if (!title || !type || !value || !spinWheelLabel) {
      return res.status(400).json({
        success: false,
        message: "Missing required prize fields",
      });
    }

    const prize = await Prize.create({
      title,
      type,
      value,
      description,
      spinWheelLabel,
      supportiveItems,
    });

    return res.status(201).json({
      success: true,
      message: "Prize created successfully",
      data: prize,
    });
  } catch (error) {
    console.error("Create Prize Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create prize",
    });
  }
};

module.exports.updatePrize = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Destructure only the allowed fields from req.body
    const {
      title,
      type,
      value,
      spinWheelLabel,
      supportiveItems,
      description,
      durationInDays,
      isActive,
    } = req.body;

    // 2. Perform the update with validation
    const prize = await Prize.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          type,
          value,
          spinWheelLabel,
          supportiveItems,
          description,
          durationInDays,
          isActive,
        },
      },
      {
        new: true, // Return the updated document
        runValidators: true, // ✅ Ensure enum and required checks are run on update
      }
    );

    if (!prize) {
      return res.status(404).json({
        success: false,
        message: "Prize not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Prize updated successfully",
      data: prize,
    });
  } catch (err) {
    console.error("Update Prize Error:", err);
    return res.status(500).json({
      success: false,
      message:
        err.name === "ValidationError" ? err.message : "Failed to update prize",
    });
  }
};

/**
 * @desc    Delete a prize by ID
 * @route   DELETE /api/v1/admin/giveaway/prizes/:id
 * @access  Private/Admin
 */
// module.exports.deletePrize = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Find and delete the prize
//     const prize = await Prize.findByIdAndDelete(id);

//     if (!prize) {
//       return res.status(404).json({
//         success: false,
//         message: "Prize not found",
//       });
//     }

//     // Log the deletion
//     // await GiveawayAudit.create({
//     //   action: 'DELETE_PRIZE',
//     //   admin: req.user._id,
//     //   targetId: id,
//     //   details: {
//     //     prizeName: prize.name,
//     //     prizeId: prize._id
//     //   }
//     // });

//     res.status(200).json({
//       success: true,
//       message: "Prize deleted successfully",
//       data: { id },
//     });
//   } catch (error) {
//     console.error("Delete Prize Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete prize",
//       error: error.message,
//     });
//   }
// };

module.exports.deletePrize = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Check if the prize is currently linked to any campaigns
    const linkedCampaign = await GiveawayCampaign.findOne({ prizeId: id });

    if (linkedCampaign) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete prize. It is currently assigned to one or more campaigns.",
      });
    }

    // 2. Perform the deletion
    const prize = await Prize.findByIdAndDelete(id);

    if (!prize) {
      return res.status(404).json({
        success: false,
        message: "Prize not found",
      });
    }

    // 3. Success Response
    res.status(200).json({
      success: true,
      message: "Prize deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete Prize Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete prize",
      error: error.message,
    });
  }
};

module.exports.createCampaign = async (req, res) => {
  try {
    const { date, prizeId } = req.body;

    const campaignDate = new Date(date);
    campaignDate.setHours(0, 0, 0, 0);

    const existingCampaign = await GiveawayCampaign.findOne({
      date: campaignDate,
    });

    if (existingCampaign) {
      return res.status(400).json({
        success: false,
        message: "Giveaway campaign already exists for this date",
      });
    }

    const prize = await Prize.findOne({
      _id: prizeId,
      isActive: true,
    });

    if (!prize) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive prize",
      });
    }

    const campaign = await GiveawayCampaign.create({
      date: campaignDate,
      prizeId: prize._id,
    });

    return res.status(201).json({
      success: true,
      message: "Giveaway campaign created successfully",
      data: {
        id: campaign._id,
        date: campaign.date,
        prize: {
          id: prize._id,
          title: prize.title,
          type: prize.type,
          value: prize.value,
        },
        drawStatus: campaign.drawStatus,
        isActive: campaign.isActive,
      },
    });
  } catch (error) {
    console.error("Create Campaign Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create giveaway campaign",
    });
  }
};

exports.getAllCampaigns = async (req, res) => {
  try {
    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const drawStatus = req.query.drawStatus || "";
    const isActive = req.query.isActive;

    // 2. Initial Match (Static filters)
    // const matchFilter = {};
    // if (drawStatus) matchFilter.drawStatus = drawStatus;
    // if (isActive !== undefined) matchFilter.isActive = isActive === "true";

    // Inside your getAllCampaigns controller
    const matchFilter = {};

    if (drawStatus === "ACTIVE") {
      // Active: Not drawn yet AND admin has it enabled
      matchFilter.drawStatus = "PENDING";
      matchFilter.isActive = true;
    } else if (drawStatus === "DISABLED") {
      // Disabled: Admin has manually toggled it off
      matchFilter.isActive = false;
    } else if (drawStatus === "COMPLETED") {
      // Completed: Draw is finished
      matchFilter.drawStatus = "COMPLETED";
    }

    const pipeline = [];

    // Filter early to improve performance
    if (Object.keys(matchFilter).length > 0) {
      pipeline.push({ $match: matchFilter });
    }

    // 3. Joins (Lookup)
    pipeline.push(
      {
        $lookup: {
          from: "giveawayprizes",
          localField: "prizeId",
          foreignField: "_id",
          as: "prize",
        },
      },
      { $unwind: { path: "$prize", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "winnerUserId",
          foreignField: "_id",
          as: "winner",
        },
      },
      { $unwind: { path: "$winner", preserveNullAndEmptyArrays: true } }
    );

    // 4. Server-side Search
    if (search?.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      pipeline.push({
        $match: {
          $or: [
            { "prize.title": regex },
            { "prize.spinWheelLabel": regex }, // Added search field
            { "winner.email": regex },
            { "winner.phone": regex },
          ],
        },
      });
    }

    // 5. Execution with Facet (Pagination)
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } }, // Default server-side sort (newest first)
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              date: 1,
              drawStatus: 1,
              isActive: 1,
              createdAt: 1,
              prize: 1,
              winner: {
                _id: "$winner._id",
                email: "$winner.email",
                phone: "$winner.phone",
              },
            },
          },
        ],
      },
    });

    const [result] = await GiveawayCampaign.aggregate(pipeline);

    const total = result.metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        totalItems: total,
        page,
        limit,
        totalPages,
      },
      data: result.data,
    });
  } catch (err) {
    console.error(">>> Get All Campaigns Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
    });
  }
};

module.exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    if (campaign.drawStatus === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Completed campaign cannot be updated",
      });
    }

    Object.assign(campaign, req.body);
    await campaign.save();

    return res.json({
      success: true,
      message: "Campaign updated successfully",
      data: campaign,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to update campaign",
    });
  }
};

// exports.getWinners = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const campaign = await GiveawayCampaign.findById(id)
//       .populate("winnerUserId", "email phone")
//       .populate("prizeId");

//     if (!campaign) {
//       return res.status(404).json({
//         success: false,
//         message: "Campaign not found",
//       });
//     }

//     return res.json({
//       success: true,
//       data: {
//         campaignId: campaign._id,
//         date: campaign.date,
//         prize: campaign.prizeId,
//         winner: campaign.winnerUserId,
//         drawStatus: campaign.drawStatus,
//         drawAt: campaign.drawAt || null,
//       },
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch winner",
//     });
//   }
// };

exports.getAllWinners = async (req, res) => {
  try {
    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    // 1. Initial Match (Index-friendly)
    const initialMatch = {};
    if (status) initialMatch.drawStatus = status;

    // 2. Base Pipeline for Joins and Search
    const pipeline = [
      { $match: initialMatch },
      {
        $lookup: {
          from: "giveawayprizes",
          localField: "prizeId",
          foreignField: "_id",
          as: "prize",
        },
      },
      { $unwind: { path: "$prize", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "winnerUserId",
          foreignField: "_id",
          as: "winner",
        },
      },
      { $unwind: { path: "$winner", preserveNullAndEmptyArrays: true } },
    ];

    // 3. Global Search Filter
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { "prize.title": searchRegex },
            { "winner.phone": searchRegex },
            { "winner.email": searchRegex },
          ],
        },
      });
    }

    // 4. Multi-Facet execution (No $sort stage here as requested)
    const results = await GiveawayCampaign.aggregate([
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          stats: [
            {
              $group: {
                _id: null,
                totalCampaigns: { $sum: 1 },
                completed: {
                  $sum: {
                    $cond: [{ $eq: ["$drawStatus", "COMPLETED"] }, 1, 0],
                  },
                },
                pending: {
                  $sum: { $cond: [{ $eq: ["$drawStatus", "PENDING"] }, 1, 0] },
                },
                withWinner: {
                  $sum: {
                    $cond: [{ $ifNull: ["$winnerUserId", false] }, 1, 0],
                  },
                },
              },
            },
          ],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                date: 1,
                drawStatus: 1,
                drawAt: 1,
                prize: {
                  _id: "$prize._id",
                  title: "$prize.title",
                  type: "$prize.type",
                  value: "$prize.value",
                  spinWheelLabel: "$prize.spinWheelLabel",
                },
                winner: {
                  $cond: {
                    if: { $gt: ["$winner._id", null] },
                    then: {
                      _id: "$winner._id",
                      phone: "$winner.phone",
                      email: "$winner.email",
                      nickname: "$winner.nickname",
                    },
                    else: null,
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    // Format Response
    const total = results[0].metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const statsKPI = results[0].stats[0] || {
      totalCampaigns: 0,
      completed: 0,
      pending: 0,
      withWinner: 0,
    };
    const data = results[0].data;

    return res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      statsKPI,
      data,
    });
  } catch (err) {
    console.error("getAllWinners error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch winners" });
  }
};

module.exports.resendPrize = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign || !campaign.winnerUserId) {
      return res.status(400).json({
        success: false,
        message: "Winner not found for this campaign",
      });
    }

    return res.json({
      success: true,
      message: "Prize resend triggered successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to resend prize",
    });
  }
};

module.exports.markPrizeAsDelivered = async (req, res) => {
  try {
    const { winHistoryId } = req.body;

    const winHistory = await GiveawayWinHistory.findById(winHistoryId);

    if (!winHistory) {
      return res.status(404).json({
        success: false,
        message: "Win history not found",
      });
    }

    if (!winHistory.claimedAt) {
      return res.status(400).json({
        success: false,
        message: "Prize not claimed yet",
      });
    }

    if (winHistory.deliveryStatus === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Prize already delivered",
      });
    }

    const prize = await GiveawayCampaign.findById(winHistory.campaignId);
    const user = await User.findById(winHistory.userId);

    // console.log(prize, "prize");
    // console.log("user", user);

    if (!prize || !user) {
      return res
        .status(400)
        .json({ success: false, message: "Prize or User not found" });
    }

    if (prize.type === "FREE_PREMIUM") {
      const today = new Date();

      const baseDate =
        user.premiumExpiresAt && user.premiumExpiresAt > today
          ? user.premiumExpiresAt
          : today;

      const extendedExpiry = new Date(baseDate);
      extendedExpiry.setDate(extendedExpiry.getDate() + prize.durationInDays);

      user.premiumExpiresAt = extendedExpiry;
      await user.save();
    }

    winHistory.deliveryStatus = "DELIVERED";
    winHistory.deliveredAt = new Date();
    await winHistory.save();

    await notificationService.sendPrizeDeliveredNotification(winHistory.userId);

    await utils.sendEmail(
      user.email,
      "🎉 Your Prize has been Delivered",
      `
    <h2>Congratulations 🎉</h2>
    <p>Your prize <b>${prize.title}</b> has been successfully delivered.</p>
    <p>Thank you for participating!</p>
  `
    );

    return res.json({
      success: true,
      message: "Prize marked as delivered",
      data: {
        deliveredAt: winHistory.deliveredAt,
      },
    });
  } catch (error) {
    console.error("Delivery API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark prize as delivered",
      error: error.message,
    });
  }
};

// module.exports.getPendingDeliveries = async (req, res) => {
//   try {
//     const records = await GiveawayWinHistory.find({
//       deliveryStatus: "PENDING",
//     })
//       .populate("userId", "phone email")
//       .populate("campaignId", "date")
//       .populate("prizeId", "title value")
//       .sort({ claimedAt: -1 });
//     res.json({
//       success: true,
//       count: records.length,
//       data: records,
//     });
//   } catch (error) {
//     console.error("Pending deliveries error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch pending deliveries",
//     });
//   }
// };

module.exports.getPendingDeliveries = async (req, res) => {
  try {
    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const deliveryStatus = req.query.deliveryStatus || "";

    // --- 1. Build Dynamic Filter ---
    const matchQuery = {};

    // If deliveryStatus is provided and isn't "ALL", filter by it
    if (
      deliveryStatus &&
      ["PENDING", "DELIVERED"].includes(deliveryStatus.toUpperCase())
    ) {
      matchQuery.deliveryStatus = deliveryStatus.toUpperCase();
    }

    const pipeline = [];

    // Stage 1: Initial Filter (Filter early for better performance)
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
    }

    // Stage 2: Joins (Lookups)
    pipeline.push(
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
          from: "giveawaycampaigns",
          localField: "campaignId",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: { path: "$campaign", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "giveawayprizes",
          localField: "prizeId",
          foreignField: "_id",
          as: "prize",
        },
      },
      { $unwind: { path: "$prize", preserveNullAndEmptyArrays: true } }
    );

    // Stage 3: Global Search (Winner info or Prize info)
    if (search?.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      pipeline.push({
        $match: {
          $or: [
            { "user.email": regex },
            { "user.phone": regex },
            { "prize.title": regex },
          ],
        },
      });
    }

    // Stage 4: Facet for Meta and Data
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } }, // Newest win histories first
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              deliveryStatus: 1,
              claimedAt: 1,
              wonAt: 1,
              year: 1,
              user: { _id: 1, nickname: 1, email: 1, phone: 1 },
              campaign: { _id: 1, date: 1 },
              prize: { _id: 1, title: 1, value: 1, type: 1 },
            },
          },
        ],
      },
    });

    const [result] = await GiveawayWinHistory.aggregate(pipeline);

    const total = result.metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      pagination: {
        totalItems: total,
        page,
        limit,
        totalPages,
      },
      data: result.data,
    });
  } catch (error) {
    console.error(">>> Get Deliveries Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching delivery data",
    });
  }
};

module.exports.getDeliveredPrizes = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find({
      deliveryStatus: "DELIVERED",
    })
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ deliveredAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Delivered prizes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivered prizes",
    });
  }
};

module.exports.getAllClaims = async (req, res) => {
  try {
    const records = await GiveawayWinHistory.find()
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Claims list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch claims",
    });
  }
};

module.exports.getGiveawayAuditReport = async (req, res) => {
  try {
    const filter = {};

    if (req.query.from && req.query.to) {
      filter.createdAt = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to),
      };
    }

    const records = await GiveawayWinHistory.find(filter)
      .populate("userId", "phone email")
      .populate("campaignId", "date")
      .populate("prizeId", "title value")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      totalRecords: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Audit report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate audit report",
    });
  }
};

module.exports.bulkCreateCampaignByRanges = async (req, res) => {
  try {
    const { ranges, isActive = true } = req.body;

    if (!Array.isArray(ranges) || ranges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ranges array is required",
      });
    }

    // 🔒 Today (local midnight)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const campaignsToInsert = [];
    const skippedDates = [];

    for (const range of ranges) {
      const { startDate, endDate, prizeId, supportiveItems } = range;

      const prize = await Prize.findById(prizeId);
      if (!prize || !prize.isActive) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive prize: ${prizeId}`,
        });
      }

      const [sy, sm, sd] = startDate.split("-").map(Number);
      const [ey, em, ed] = endDate.split("-").map(Number);

      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date",
        });
      }

      const normalizedSupportiveItems = Array.isArray(supportiveItems)
        ? supportiveItems.filter(Boolean)
        : [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const campaignDate = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate()
        );

        // ❌ Skip past dates
        if (campaignDate < today) {
          skippedDates.push({
            date: campaignDate,
            reason: "Past date",
          });
          continue;
        }

        // ❌ Skip if campaign already exists
        const exists = await GiveawayCampaign.findOne({
          date: campaignDate,
        }).lean();

        if (exists) {
          skippedDates.push({
            date: campaignDate,
            reason: "Campaign already exists",
          });
          continue;
        }

        campaignsToInsert.push({
          date: campaignDate,
          prizeId,
          supportiveItems: normalizedSupportiveItems, // 🔥 FIXED
          isActive,
          drawStatus: "PENDING",
        });
      }
    }

    if (campaignsToInsert.length > 0) {
      await GiveawayCampaign.insertMany(campaignsToInsert);
    }

    return res.status(201).json({
      success: true,
      message: "Range-based campaigns processed successfully",
      summary: {
        created: campaignsToInsert.length,
        skipped: skippedDates.length,
      },
      skippedDates,
    });
  } catch (error) {
    console.error("bulkCreateCampaignByRanges error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk create campaigns",
    });
  }
};

module.exports.disableCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await GiveawayCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Already disabled
    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: "Campaign is already disabled",
      });
    }

    campaign.isActive = false;
    campaign.failureReason = "Disabled by admin";
    await campaign.save();

    return res.json({
      success: true,
      message: "Campaign disabled successfully",
    });
  } catch (error) {
    console.error("Disable campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disable campaign",
    });
  }
};

module.exports.pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id, "campaignId");

    const campaign = await GiveawayCampaign.findById(id);
    console.log(campaign.isActive, "active");

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: "Campaign is already paused",
      });
    }

    campaign.isActive = false;
    campaign.failureReason = "Paused by admin";
    await campaign.save();
    console.log(campaign.isActive, "afteractive");

    return res.json({
      success: true,
      message: "Campaign paused successfully",
    });
  } catch (error) {
    console.error("Pause campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to pause campaign",
    });
  }
};

/**
 * @desc    Delete a campaign by ID
 * @route   DELETE /api/v1/admin/giveaway/campaigns/:id
 * @access  Private/Admin
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if there are any winners for this campaign
    const hasWinners = await GiveawayWinHistory.exists({
      campaignId: id,
      wonAt: { $exists: true }, // Ensure wonAt is present
    });

    if (hasWinners) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete campaign with existing winners",
        code: "CAMPAIGN_HAS_WINNERS",
      });
    }

    // Also check if there are any pending claims
    const hasPendingClaims = await GiveawayWinHistory.exists({
      campaignId: id,
      claimedAt: null, // Not claimed yet
      wonAt: { $exists: true }, // But has won
    });

    if (hasPendingClaims) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete campaign with pending claims",
        code: "CAMPAIGN_HAS_PENDING_CLAIMS",
      });
    }

    // Find and delete the campaign
    const campaign = await GiveawayCampaign.findByIdAndDelete(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Log the deletion
    // await GiveawayAudit.create({
    //   action: 'DELETE_CAMPAIGN',
    //   admin: req.user._id,
    //   targetId: id,
    //   details: {
    //     campaignName: campaign.name,
    //     campaignId: campaign._id
    //   }
    // });

    res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete Campaign Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
      error: error.message,
    });
  }
};

module.exports.getParticipants = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { page = 1, limit = 20, search = "" } = req.query;

    const campaign = await GiveawayCampaign.findById(campaignId).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const participantIds = campaign.participants || [];

    if (!participantIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      });
    }

    const profileMatchFilter = {
      userId: { $in: participantIds },
    };

    if (search) {
      profileMatchFilter.$or = [
        { nickname: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Profile.countDocuments(profileMatchFilter);

    const skip = (Number(page) - 1) * Number(limit);

    const participants = await Profile.aggregate([
      {
        $match: profileMatchFilter,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$userId",
          nickname: "$nickname",
          fullName: "$fullName",
          age: "$age",
          gender: "$gender",
          photo: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$photos",
                  as: "p",
                  cond: { $eq: ["$$p.order", 0] },
                },
              },
              0,
            ],
          },
          city: "$location.city",
          country: "$location.country",
          phone: "$user.phone",
          email: "$user.email",
          isPremium: "$user.isPremium",
          accountStatus: "$user.accountStatus",
          isWinner: {
            $cond: {
              if: {
                $eq: ["$userId", campaign.winnerUserId],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      { $skip: skip },
      { $limit: Number(limit) },
    ]);

    return res.status(200).json({
      success: true,
      campaign: {
        _id: campaign._id,
        date: campaign.date,
        drawStatus: campaign.drawStatus,
        totalParticipants: campaign.totalParticipants,
        winnerUserId: campaign.winnerUserId,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: participants,
    });
  } catch (error) {
    console.error("Get participants error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch participants",
    });
  }
};
